import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { 
  Mic2, 
  Youtube, 
  CalendarDays, 
  User, 
  Radio, 
  Newspaper, 
  Menu, 
  X, 
  ChevronRight, 
  MapPin, 
  ChevronLeft, 
  Mail, 
  Phone, 
  ChevronDown, 
  ArrowLeft, 
  PlayCircle,
  ExternalLink, 
  Download, 
  Briefcase, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

// --- SECURITY & EMAIL SETUP ---
const AUTHORIZED_ID = import.meta.env.VITE_AUTHORIZED_ID ?? "";
const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT ?? "";
const GOOGLE_CALENDAR_API_KEY = import.meta.env.VITE_GCAL_API_KEY ?? "";
const GOOGLE_CALENDAR_ID = import.meta.env.VITE_GCAL_ID ?? "";
const YOUTUBE_CHANNEL_ID = import.meta.env.VITE_YT_CHANNEL_ID ?? "UC8Fy07TKY0txLxOgj7edHCA";

const isSafeExternalUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'https:' || (import.meta.env.DEV && parsedUrl.protocol === 'http:');
  } catch {
    return false;
  }
};

const safeExternalUrl = (value, fallback = '') => (isSafeExternalUrl(value) ? value : fallback);

const YOUTUBE_FEED_CACHE_KEY = 'yt-latest-videos-cache-v2';
const YOUTUBE_FEED_CACHE_TTL_MS = 1000 * 60 * 30;

const summarizeVideoDescription = (value) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 140) return normalized;
  return `${normalized.slice(0, 137)}...`;
};

const getEntryText = (entry, localName, namespacedName) => {
  const localNode = entry.getElementsByTagNameNS('*', localName)[0];
  if (localNode?.textContent) return localNode.textContent.trim();
  const namespacedNode = entry.getElementsByTagName(namespacedName)[0];
  if (namespacedNode?.textContent) return namespacedNode.textContent.trim();
  return '';
};

const getEntryAttr = (entry, localName, namespacedName, attrName) => {
  const localNode = entry.getElementsByTagNameNS('*', localName)[0];
  if (localNode?.getAttribute(attrName)) return localNode.getAttribute(attrName);
  const namespacedNode = entry.getElementsByTagName(namespacedName)[0];
  if (namespacedNode?.getAttribute(attrName)) return namespacedNode.getAttribute(attrName);
  return '';
};

const extractYouTubeIdFromUrl = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.replace('/', '').trim();
    }
    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v');
    }
    if (parsed.pathname.startsWith('/shorts/')) {
      return parsed.pathname.replace('/shorts/', '').split('/')[0];
    }
  } catch {
    return '';
  }
  return '';
};

const getVideoThumbnailUrl = (video) => {
  if (video.thumbnail) return video.thumbnail;
  const videoId = video.videoId || extractYouTubeIdFromUrl(video.url);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
};

const isYouTubeShort = (video) => {
  if (!video) return false;
  const textBlob = `${video.title || ''} ${video.description || ''}`;
  return (video.url || '').includes('/shorts/') || /\b#shorts\b/i.test(textBlob);
};

const parseYouTubeFeed = (xmlText) => {
  if (typeof DOMParser === 'undefined') return [];
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (xml.querySelector('parsererror')) return [];

  const entries = Array.from(xml.getElementsByTagName('entry'));
  return entries.map((entry, index) => {
    const title = getEntryText(entry, 'title', 'title');
    const videoId = getEntryText(entry, 'videoId', 'yt:videoId');
    const description = getEntryText(entry, 'description', 'media:description');
    const thumbnail = getEntryAttr(entry, 'thumbnail', 'media:thumbnail', 'url');
    const altLink = Array.from(entry.getElementsByTagName('link')).find((node) => node.getAttribute('rel') === 'alternate');
    const feedUrl = altLink?.getAttribute('href') ?? '';
    const url = feedUrl || (videoId ? `https://youtu.be/${videoId}` : '');
    const isShort = isYouTubeShort({ url, title, description });

    return {
      id: videoId || `feed-video-${index}`,
      title: title || 'Latest video',
      description: summarizeVideoDescription(description) || 'Watch the newest upload on YouTube.',
      videoId,
      thumbnail,
      url,
      isShort
    };
  }).filter((video) => Boolean(video.url) && !video.isShort).slice(0, 6);
};

// --- PERMANENT VIDEOS LIST ---
// Update these links and titles whenever you want to feature new content.
const PERMANENT_VIDEOS = [
  {
    id: 'vid-1',
    title: "Line 6 Helix Stadium XL Re-Amping Explained – Connections, DAW Setup & Pro Workflow",
    description: "A complete guide to Re-amp you Tone",
    url: "https://youtu.be/L0YwTKA4mTs"
  },
  {
    id: 'vid-2',
    title: "The Dying Trade? Honest Thoughts from a Working Musician",
    description: "Honest diary of a working musician...",
    url: "https://youtu.be/zrhRaPh0OQg"
  },
  {
    id: 'vid-3',
    title: "PRS SE Tuner Upgrade",
    description: "A quick and easy upgrade for the SilverSky SE....",
    url: "https://youtu.be/jBtOIuNKzqw"
  },
  {
    id: 'vid-4',
    title: "Building the Perfect Boogie Tone",
    description: "How I Build epic Tones.",
    url: "https://youtu.be/wRD_DoIxsN0"
  },
  {
    id: 'vid-5',
    title: "Fractal AM4",
    description: "1st Date, real thing or one night stand?",
    url: "https://youtu.be/BbLj8mmObAw"
  },
  {
    id: 'vid-6',
    title: "Helix Stadium 1.2.1 Update",
    description: "Di Line 6 Finaly Crack it?",
    url: "https://youtu.be/lMyQ_cp_4n0"
  }
];

// --- FIREBASE SETUP ---
const parseInjectedFirebaseConfig = () => {
  const rawConfig = typeof globalThis !== 'undefined' ? globalThis.__firebase_config : undefined;
  if (typeof rawConfig !== 'string') return {};
  try {
    return JSON.parse(rawConfig);
  } catch {
    return {};
  }
};

const firebaseConfig = parseInjectedFirebaseConfig();
const initialAuthToken = typeof globalThis !== 'undefined' ? globalThis.__initial_auth_token : undefined;
const appId = typeof globalThis !== 'undefined' && globalThis.__app_id ? globalThis.__app_id : 'tone-shift-hub';
let app, auth, db;
if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [gigs, setGigs] = useState([]);
  const [isLoadingGigs, setIsLoadingGigs] = useState(true);
  const [videos, setVideos] = useState(PERMANENT_VIDEOS);
  
  const [blogPosts, setBlogPosts] = useState([]);
  const [visibleGigsCount, setVisibleGigsCount] = useState(6);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedGig, setSelectedGig] = useState(null);
  const [selectedVenuePackImage, setSelectedVenuePackImage] = useState(null);
  const [formStatus, setFormStatus] = useState('idle');

  const [newPost, setNewPost] = useState({
    id: null,
    title: '',
    tag: 'Tech',
    img: '',
    imgHeight: 400,
    imgFit: 'cover',
    content: '',
    date: new Date().toLocaleDateString('en-GB')
  });

  const isOwner = user && (AUTHORIZED_ID === "" || user.uid === AUTHORIZED_ID);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const blogRef = collection(db, 'artifacts', appId, 'public', 'data', 'blogPosts');
    const unsubscribeBlog = onSnapshot(blogRef, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBlogPosts(posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }, (error) => console.error("Blog fetch error:", error));
    return () => unsubscribeBlog();
  }, [user]);

  useEffect(() => {
    let isCancelled = false;

    const loadLatestVideos = async () => {
      if (!YOUTUBE_CHANNEL_ID) return;

      try {
        const cachedRaw = window.localStorage.getItem(YOUTUBE_FEED_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.expiresAt > Date.now() && Array.isArray(cached?.videos) && cached.videos.length > 0) {
            const filteredCachedVideos = cached.videos.filter((video) => !isYouTubeShort(video)).slice(0, 6);
            if (filteredCachedVideos.length > 0) {
              setVideos(filteredCachedVideos);
              return;
            }
          }
        }
      } catch {
        // Ignore cache read issues and continue with network fetch.
      }

      // Keep fallback list short-free too.
      const filteredFallbackVideos = PERMANENT_VIDEOS.filter((video) => !isYouTubeShort(video)).slice(0, 6);
      if (filteredFallbackVideos.length > 0) {
        setVideos(filteredFallbackVideos);
      }

      const baseFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(YOUTUBE_CHANNEL_ID)}`;
      const feedUrls = [
        baseFeedUrl,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(baseFeedUrl)}`
      ];

      for (const feedUrl of feedUrls) {
        try {
          const response = await fetch(feedUrl, {
            headers: { Accept: 'application/atom+xml,text/xml,application/xml,*/*' }
          });
          if (!response.ok) continue;

          const feedText = await response.text();
          const latestVideos = parseYouTubeFeed(feedText);
          if (latestVideos.length === 0) continue;
          if (isCancelled) return;

          setVideos(latestVideos);
          try {
            window.localStorage.setItem(YOUTUBE_FEED_CACHE_KEY, JSON.stringify({
              expiresAt: Date.now() + YOUTUBE_FEED_CACHE_TTL_MS,
              videos: latestVideos
            }));
          } catch {
            // Ignore cache write issues.
          }
          return;
        } catch {
          // Try next feed endpoint.
        }
      }
    };

    loadLatestVideos();
    return () => {
      isCancelled = true;
    };
  }, []);

  const venuePackItems = [
    { id: 'vp-1', title: "Promo Shot 1", type: "Poster", url: "https://iili.io/q3vvvsa.jpg", thumb: "https://iili.io/q3vvvsa.jpg" },
    { id: 'vp-2', title: "Promo Shot 2", type: "Photography", url: "https://iili.io/q3YTmYb.png", thumb: "https://iili.io/q3YTmYb.png" },
    { id: 'vp-3', title: "Live Action", type: "Photography", url: "https://iili.io/q3uogY7.jpg", thumb: "https://iili.io/q3uogY7.jpg" }
  ];

  const navigateTo = (section) => {
    setActiveSection(section);
    setSelectedGig(null);
    setSelectedVenuePackImage(null);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const isToneShift = ['videos', 'news', 'business', 'admin'].includes(activeSection);
  const allGigs = [...gigs].sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
  const safeVenuePackImageUrl = selectedVenuePackImage ? safeExternalUrl(selectedVenuePackImage.url) : '';

  const handleFormSubmit = async (e, formType) => {
    e.preventDefault();
    if (!isSafeExternalUrl(FORM_ENDPOINT)) {
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 5000);
      return;
    }
    setFormStatus('submitting');
    const formData = new FormData(e.target);
    formData.append('Subject', `New Enquiry: ${formType}`);
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        setFormStatus('success');
        e.target.reset();
        setTimeout(() => setFormStatus('idle'), 5000);
      } else { throw new Error(); }
    } catch {
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 5000);
    }
  };

  const handleEditClick = (post) => {
    setNewPost({
      id: post.id, title: post.title, tag: post.tag, img: post.img || '',
      imgHeight: post.imgHeight || 400, imgFit: post.imgFit || 'cover',
      content: post.content, date: post.date
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewPost({ id: null, title: '', tag: 'Tech', img: '', imgHeight: 400, imgFit: 'cover', content: '', date: new Date().toLocaleDateString('en-GB') });
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!isOwner || !db) return;
    const normalizedImageUrl = newPost.img.trim();
    if (normalizedImageUrl && !isSafeExternalUrl(normalizedImageUrl)) {
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 3000);
      return;
    }
    try {
      if (newPost.id) {
        const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'blogPosts', newPost.id);
        await updateDoc(postRef, {
          title: newPost.title, tag: newPost.tag, img: normalizedImageUrl, imgHeight: newPost.imgHeight,
          imgFit: newPost.imgFit, content: newPost.content, date: newPost.date, lastUpdated: new Date().toISOString()
        });
      } else {
        const blogRef = collection(db, 'artifacts', appId, 'public', 'data', 'blogPosts');
        await addDoc(blogRef, { ...newPost, img: normalizedImageUrl, timestamp: new Date().toISOString() });
      }
      handleCancelEdit();
      setFormStatus('success');
      setTimeout(() => setFormStatus('idle'), 3000);
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (id) => {
    if (!isOwner || !db) return;
    if (!window.confirm("Delete this post?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blogPosts', id));
  };

  // --- EXTERNAL FETCHES ---
  useEffect(() => {
    const fetchGigs = async () => {
      setIsLoadingGigs(true);
      if (!GOOGLE_CALENDAR_API_KEY || !GOOGLE_CALENDAR_ID) {
        setIsLoadingGigs(false);
        return;
      }
      try {
        const now = new Date().toISOString();
        const calendarPath = encodeURIComponent(GOOGLE_CALENDAR_ID);
        const apiKey = encodeURIComponent(GOOGLE_CALENDAR_API_KEY);
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarPath}/events?key=${apiKey}&timeMin=${now}&singleEvents=true&orderBy=startTime&maxResults=50`);
        const data = await response.json();
        if (data.items) {
          setGigs(data.items.map((item, index) => {
            const startDate = new Date(item.start.dateTime || item.start.date);
            return {
              id: item.id || `gig-${index}`, venue: item.summary || 'Live Gig', location: item.location || 'TBA',
              date: startDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
              time: item.start.dateTime ? startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBA',
              rawDate: startDate
            };
          }));
        }
      } catch (error) { console.warn("Google Calendar fetch issue:", error); }
      setIsLoadingGigs(false);
    };
    fetchGigs();
  }, []);

  const renderCalendar = () => {
    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
    let firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; 
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 md:p-6 mb-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white transition-colors"><ChevronLeft size={20}/></button>
          <h3 className="text-xl font-bold text-white">{monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}</h3>
          <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white transition-colors"><ChevronRight size={20}/></button>
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {dayHeaders.map(day => ( <div key={`header-${day}`} className="text-center text-sm font-semibold text-white/40 py-2">{day}</div> ))}
          {Array(firstDay).fill(null).map((_, i) => ( <div key={`blank-${i}`} className="p-2 md:p-4 bg-white/5 rounded-lg"></div> ))}
          {Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => {
            const gig = allGigs.find(g => {
              const d = new Date(g.rawDate);
              return d.getDate() === day && d.getMonth() === calendarDate.getMonth() && d.getFullYear() === calendarDate.getFullYear();
            });
            return (
              <button key={`day-${day}`} onClick={() => gig && setSelectedGig(gig)} className={`p-2 md:p-4 rounded-lg border flex flex-col items-center justify-center min-h-[60px] md:min-h-[80px] transition-all ${gig ? 'bg-blue-600/40 border-blue-400/50 text-white hover:bg-blue-600/60 shadow-lg' : 'bg-white/5 border-transparent text-white/20 cursor-default'}`}>
                <span className="text-lg font-semibold">{day}</span>
                {gig && <div className="w-2 h-2 rounded-full bg-blue-400 mt-1 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>}
              </button>
            )
          })}
        </div>
      </div>
    );
  };

  const NavItem = ({ section, label, icon: Icon }) => {
    const isActive = activeSection === section;
    let style = isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white';
    return (
      <button onClick={() => navigateTo(section)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full ${style}`}>
        <Icon size={18} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  const DropdownItem = ({ section, label, icon: Icon }) => {
    const isActive = activeSection === section;
    let style = isActive ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500' : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent';
    return (
      <button onClick={() => navigateTo(section)} className={`flex items-center gap-3 px-4 py-3 w-full text-left transition-colors ${style}`}>
        <Icon size={18} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen font-sans relative z-0 text-white selection:bg-blue-500/30">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playwrite+AU+SA:wght@100..400&display=swap');`}</style>
      
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className={`absolute inset-0 transition-opacity duration-700 ${isToneShift ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://iili.io/q3VBxCQ.jpg')" }} />
          <div className="absolute inset-0 bg-black/80" />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-700 ${isToneShift ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://iili.io/q3h4tyX.png')" }} />
          <div className="absolute inset-0 bg-black/90" />
        </div>
      </div>

      <nav className="border-b sticky top-0 z-50 bg-black/50 border-white/10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center relative">
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-0.5 bg-white/30 shadow-[0_0_14px_rgba(255,255,255,0.28)] pointer-events-none"></div>
          <div className="hidden lg:flex items-center gap-3">
            <button className="text-white font-normal text-3xl tracking-wide drop-shadow-lg" style={{ fontFamily: "'Playwrite AU SA', cursive" }} onClick={() => navigateTo('home')}>
              Max McTavish
            </button>
            <span className="text-white/20 text-xl font-bold">|</span>
            <div className="relative group">
              <button className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${!isToneShift && activeSection !== 'home' ? 'bg-blue-600 text-white' : 'text-white/80 hover:bg-white/10'}`}>
                Max Live <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden shadow-2xl">
                <DropdownItem section="bio" label="About Max" icon={User} />
                <DropdownItem section="gigs" label="Upcoming Gigs" icon={CalendarDays} />
                <DropdownItem section="venue-pack" label="Venue Pack" icon={Download} />
                <DropdownItem section="bookings" label="Bookings" icon={Mail} />
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <img src="https://iili.io/q3ui8a1.png" alt="ToneShift" className="h-10 w-auto object-contain cursor-pointer" onClick={() => navigateTo('videos')} />
            <div className="relative group">
              <button className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isToneShift && activeSection !== 'home' ? 'bg-blue-600 text-white' : 'text-white/80 hover:bg-white/10'}`}>
                ToneShift <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-48 rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden shadow-2xl">
                <DropdownItem section="videos" label="YouTube" icon={Youtube} />
                <DropdownItem section="news" label="Guitar Blog" icon={Newspaper} />
                <DropdownItem section="business" label="Business" icon={Briefcase} />
                {isOwner && <DropdownItem section="admin" label="Manager" icon={Settings} />}
              </div>
            </div>
          </div>

          <div className="lg:hidden cursor-pointer flex items-center gap-3" onClick={() => navigateTo('home')}>
            <span className="text-white font-normal text-2xl md:text-3xl tracking-wide drop-shadow-lg" style={{ fontFamily: "'Playwrite AU SA', cursive" }}>Max McTavish</span>
            <span className="text-white/20 text-xl font-bold">|</span>
            <img src="https://iili.io/q3ui8a1.png" alt="ToneShift" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          <button className="lg:hidden p-2 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle Menu">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* HOME SECTION */}
        {activeSection === 'home' && (
          <div className="space-y-12">
            <section className="text-center py-12 md:py-20 animate-in fade-in slide-in-from-top-4 duration-700">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-white drop-shadow-md">Live Music & Guitar Technology</h1>
              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">Welcome. I'm Max, a live performing guitarist and singer. I also run ToneShift, where we dive deep into guitar gear, digital modellers, and tone creation.</p>
            </section>
            
            <div className="grid md:grid-cols-2 gap-8 items-stretch">
              <div onClick={() => navigateTo('gigs')} className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl cursor-pointer hover:border-blue-500/50 hover:bg-black/70 transition-all group overflow-hidden flex flex-col shadow-2xl">
                <div className="h-56 relative overflow-hidden">
                  <img src="https://iili.io/q3uogY7.jpg" alt="Max Live Performance" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 opacity-80" />
                </div>
                <div className="p-8 pt-6 flex-grow flex flex-col relative z-20">
                  <div className="flex items-center gap-3 mb-4"><Mic2 size={24} className="text-blue-400" /><h2 className="text-2xl font-bold text-white">Max Live Performance</h2></div>
                  <p className="text-white/60 mb-8 min-h-[64px] flex-grow">UK Based Guitar Vocalist hits from 60s on.....<br /> Find out where I'm playing next.</p>
                  <div className="flex items-center text-sm font-semibold text-blue-400 mt-auto">View upcoming gigs <ChevronRight size={16} className="ml-1" /></div>
                </div>
              </div>
              <div onClick={() => navigateTo('videos')} className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl cursor-pointer hover:border-blue-500/50 hover:bg-black/80 transition-all group overflow-hidden flex flex-col shadow-2xl">
                <div className="h-56 relative overflow-hidden flex items-center justify-center bg-white/5"><img src="https://iili.io/q3ui8a1.png" alt="ToneShift Logo" className="h-24 object-contain drop-shadow-2xl relative z-20 group-hover:scale-105 transition-transform duration-500" /></div>
                <div className="p-8 pt-6 flex-grow flex flex-col relative z-20">
                  <div className="flex items-center gap-3 mb-4"><Youtube size={24} className="text-blue-400" /><h2 className="text-2xl font-bold text-white">ToneShift Channel</h2></div>
                  <p className="text-white/60 mb-8 min-h-[64px] flex-grow">Guitar tech, amp modellers, and gear reviews. Check out the newest content on the channel.</p>
                  <div className="flex items-center text-sm font-semibold text-blue-400 mt-auto">Watch videos <ChevronRight size={16} className="ml-1" /></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GUITAR BLOG SECTION */}
        {activeSection === 'news' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col items-center mb-12 text-center">
              <img src="https://iili.io/q3ui8a1.png" alt="ToneShift" className="h-16 mb-4 object-contain" />
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase tracking-widest">Guitar Blog</h2>
              <p className="text-white/40">A journal of gear deep-dives, tech tips, and tone experiments.</p>
            </div>
            {blogPosts.length === 0 ? (
              <div className="text-center py-20 bg-black/40 border border-white/10 rounded-3xl backdrop-blur-md">
                <Newspaper className="mx-auto text-white/10 mb-4" size={48} />
                <p className="text-white/40 text-lg">Journal entries coming soon.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {blogPosts.map((post, idx) => (
                  (() => {
                    const safePostImageUrl = safeExternalUrl(post.img);
                    return (
                      <article key={`${post.id}-${idx}`} className="bg-black/60 backdrop-blur-md border border-white/10 p-8 md:p-12 rounded-2xl shadow-xl overflow-hidden flex flex-col items-center text-center">
                        <div className="flex justify-center gap-3 mb-6"><span className="text-xs font-bold text-blue-400 bg-blue-900/40 px-3 py-1 rounded-full">{post.tag}</span><span className="text-sm text-white/40">{post.date}</span></div>
                        <h3 className="text-4xl font-bold mb-8 leading-tight max-w-2xl">{post.title}</h3>
                        {safePostImageUrl && (
                          <div className="w-full bg-black/40 rounded-xl mb-10 border border-white/5 flex items-center justify-center overflow-hidden" style={{ height: `${post.imgHeight || 400}px` }}>
                            <img src={safePostImageUrl} alt={post.title} className={`w-full h-full ${post.imgFit === 'contain' ? 'object-contain' : 'object-cover'}`} />
                          </div>
                        )}
                        <div className="text-white/70 leading-relaxed whitespace-pre-wrap text-xl font-light max-w-2xl">{post.content}</div>
                      </article>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        )}

        {/* BIO SECTION */}
        {activeSection === 'bio' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3"><User className="text-white/40" /> About Max</h2>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-2xl items-stretch">
              <div className="md:w-1/3 flex-shrink-0"><img src="https://iili.io/q3uogY7.jpg" alt="Max McTavish" className="w-full h-full object-cover min-h-[300px]" /></div>
              <div className="p-8 text-lg text-white/80 space-y-4 leading-relaxed">
                <p className="font-bold text-white text-xl">Max McTavish brings a big sound to the stage.</p>
                <p>Blending live guitar and powerful vocals with professionally produced backing tracks, he delivers the impact and energy of a full band in a streamlined, reliable format.</p>
                <p>Covering a crowd-pleasing mix of pop, rock and timeless classics, Max builds his sets around the room. From early-evening background ambience to full dance-floor anthems later in the night, the performance evolves naturally to suit the audience and the occasion.</p>
                <p>Every show is built on strong musicianship, high production standards and dependable professionalism. With quality sound, tight arrangements and confident stage presence, Max offers a polished live act ideal for clubs, pubs and corporate events.</p>
                <p>If you’re looking for a performer who understands how to read a crowd and keep the energy where it needs to be, Max delivers a show that feels bigger than the stage.</p>
              </div>
            </div>
          </div>
        )}

        {/* GIGS SECTION */}
        {activeSection === 'gigs' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            {selectedGig ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => setSelectedGig(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors group"><ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /><span className="font-medium">Back to Gigs</span></button>
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
                  <h2 className="text-4xl md:text-5xl font-bold mb-4">{selectedGig.venue}</h2>
                  <div className="flex flex-wrap gap-4 mb-8 pb-8 border-b border-white/10"><div className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full border border-blue-500/30"><CalendarDays size={18} /><span>{selectedGig.date}</span></div><div className="flex items-center gap-2 bg-white/5 text-white/80 px-4 py-2 rounded-full border border-white/10"><Radio size={18} /><span>{selectedGig.time}</span></div></div>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedGig.venue + ' ' + selectedGig.location)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95"><MapPin size={20} />Open in Maps<ExternalLink size={16} className="opacity-60" /></a>
                  <div className="mt-8 space-y-6"><div><h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-2">Location</h3><p className="text-xl text-white/90">{selectedGig.location}</p></div></div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                  <h2 className="text-3xl font-bold flex items-center gap-3 text-white"><CalendarDays className="text-white/40" /> Upcoming Gigs</h2>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => setShowCalendar(!showCalendar)} className="flex-1 md:flex-none text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-white/5">{showCalendar ? 'View List' : 'Browse by Month'}</button>
                    <button onClick={() => navigateTo('bookings')} className="flex-1 md:flex-none text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20">Bookings</button>
                  </div>
                </div>
                {isLoadingGigs ? <div className="text-white/40 text-center py-8">Loading gigs...</div> : showCalendar ? renderCalendar() : (
                  <div className="space-y-4">
                    {allGigs.slice(0, visibleGigsCount).map((gig, idx) => (
                      <button key={`${gig.id}-${idx}`} onClick={() => setSelectedGig(gig)} className="w-full text-left bg-black/60 backdrop-blur-md border border-white/10 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl hover:bg-black/80 hover:border-blue-500/30 transition-all group">
                        <div><div className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{gig.venue}</div><div className="text-white/40 flex items-center gap-2"><MapPin size={16} className="text-blue-400/50" /> {gig.location}</div></div>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto"><div className="flex items-center gap-4 text-white bg-black/40 px-4 py-3 rounded-lg border border-white/10 w-full md:w-auto justify-center"><div className="font-semibold text-blue-400">{gig.date}</div><div className="w-px h-4 bg-white/10"></div><div>{gig.time}</div></div></div>
                      </button>
                    ))}
                    {visibleGigsCount < allGigs.length && (
                      <div className="pt-2 flex justify-center">
                        <button
                          onClick={() => setVisibleGigsCount((count) => Math.min(count + 5, allGigs.length))}
                          className="text-sm bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-lg font-medium transition-colors border border-white/10"
                        >
                          Show 5 More
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VENUE PACK */}
        {activeSection === 'venue-pack' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500 text-center">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3 text-white"><Download className="text-white/40" /> Venue Publicity Pack</h2>
            <div className="flex flex-wrap justify-center gap-8 pt-10">
              {venuePackItems.map((item, idx) => (
                <button key={`${item.id}-${idx}`} onClick={() => setSelectedVenuePackImage(item)} className="group relative w-full max-w-[260px] aspect-[3/4] bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all shadow-xl">
                  <img src={item.thumb} alt={item.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5 text-left"><span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">{item.type}</span><span className="text-white font-medium text-sm truncate">{item.title}</span></div>
                </button>
              ))}
            </div>
            {selectedVenuePackImage && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedVenuePackImage(null)}></div>
                <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
                  <button onClick={() => setSelectedVenuePackImage(null)} className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors flex items-center gap-2"><span className="font-medium text-sm">Close</span><X size={24} /></button>
                  <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-3xl">
                    <div className="overflow-auto bg-black/20 flex justify-center">{safeVenuePackImageUrl && <img src={safeVenuePackImageUrl} alt={selectedVenuePackImage.title} className="max-w-full h-auto object-contain shadow-2xl" />}</div>
                    <div className="p-6 md:p-8 bg-black/60 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left"><div><h3 className="text-2xl font-bold text-white mb-1">{selectedVenuePackImage.title}</h3><p className="text-white/40 text-sm font-medium uppercase tracking-widest">{selectedVenuePackImage.type} Material</p></div><a href={safeVenuePackImageUrl || '#'} onClick={(e) => !safeVenuePackImageUrl && e.preventDefault()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95"><Download size={20} />Download Full Size</a></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS SECTION */}
        {activeSection === 'bookings' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-white"><Mail className="text-white/40" /> Bookings & Enquiries</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-8 rounded-2xl flex flex-col h-full shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-4">Direct Bookings</h3>
                {formStatus === 'success' ? (
                  <div className="bg-green-600/20 border border-green-500 text-green-300 p-6 rounded-xl text-center font-medium animate-in zoom-in-95">Message Sent Successfully!</div>
                ) : (
                  <form onSubmit={(e) => handleFormSubmit(e, 'Direct Booking')} className="space-y-4">
                    <input type="text" name="name" placeholder="Your Name" required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                    <input type="email" name="email" placeholder="Your Email" required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                    <textarea name="details" placeholder="Event Details..." required rows="3" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none" />
                    <button type="submit" disabled={formStatus === 'submitting'} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium w-full shadow-lg active:scale-95 disabled:opacity-50">
                      {formStatus === 'submitting' ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-8 rounded-2xl flex flex-col h-full shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-4">Book via Agency</h3>
                <p className="text-white/70 mb-8 leading-relaxed">Book through my agent at Foremost Entertainments Ltd.</p>
                <div className="bg-black/40 p-6 rounded-xl border border-white/10 mb-6"><div className="font-semibold text-white text-lg mb-2">Foremost Entertainments Ltd.</div><div className="text-white/40 text-sm mb-4">5 Skegby Road, Huthwaite, Notts. NG17 2PL</div><div className="text-white/80 text-sm flex items-center gap-3 pt-4 border-t border-white/10"><Phone size={16} className="text-blue-400" /><a href="tel:07739099369" className="hover:text-blue-400 transition-colors font-medium">07739 099369</a></div></div>
                <a href="https://www.foremostentertainments.co.uk/contact.php" target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg transition-colors border border-white/5 font-medium">Visit Agency Contact Page <ChevronRight size={16} /></a>
              </div>
            </div>
          </div>
        )}

        {/* BUSINESS / PARTNER SECTION */}
        {activeSection === 'business' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-white"><Briefcase className="text-white/40" /> Business & Gear Enquiries</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-8 rounded-2xl flex flex-col h-full shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <img src="https://iili.io/q3ui8a1.png" alt="ToneShift" className="h-10 object-contain" />
                  <h3 className="text-2xl font-bold text-white">Work with ToneShift</h3>
                </div>
                
                <div className="space-y-6 text-white/70 leading-relaxed mb-8 flex-grow">
                  <p>ToneShift reaches a dedicated community of guitarists, tech enthusiasts, and gear collectors. I offer professional partnership opportunities including:</p>
                  
                  <ul className="space-y-4">
                    <li className="flex items-start gap-4">
                      <CheckCircle2 className="text-blue-400 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <span className="text-white font-bold block">Gear & Software Reviews & Tutorials</span>
                        <span className="text-sm">In-depth analysis, real-world testing, and practical "how-to" guides for hardware and plugins.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <CheckCircle2 className="text-blue-400 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <span className="text-white font-bold block">Professional Demos</span>
                        <span className="text-sm">High-quality audio and video demonstrations showcasing your product's best features.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <CheckCircle2 className="text-blue-400 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <span className="text-white font-bold block">Artist & Tech Interviews</span>
                        <span className="text-sm">Engaging conversations with builders, developers, and industry professionals.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <CheckCircle2 className="text-blue-400 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <span className="text-white font-bold block">Advertising & Placements</span>
                        <span className="text-sm">Targeted spots within my video content and blog entries.</span>
                      </div>
                    </li>
                  </ul>

                  <div className="pt-6 border-t border-white/10 mt-6">
                    <div className="flex items-start gap-3 text-white/90">
                      <ShieldCheck className="text-blue-400 mt-1 flex-shrink-0" size={20} />
                      <p className="text-sm font-medium">
                        <span className="text-blue-400 font-bold">Honest Opinion & Integrity:</span> My audience trusts ToneShift for unbiased, factual testing. Every review is my 100% honest opinion, and channel integrity is paramount to me.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-8 rounded-2xl flex flex-col h-full shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-6">Send an Enquiry</h3>
                {formStatus === 'success' ? ( 
                  <div className="bg-blue-600/20 border border-blue-500 text-blue-300 p-6 rounded-xl text-center font-medium animate-in zoom-in-95 my-auto">Enquiry Sent! I'll get back to you shortly.</div> 
                ) : (
                  <form onSubmit={(e) => handleFormSubmit(e, 'Business Enquiry')} className="space-y-4">
                    <input type="text" name="name" placeholder="Your Name" required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                    <input type="text" name="company" placeholder="Company Name" required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                    <input type="email" name="email" placeholder="Work Email" required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                    <textarea name="message" placeholder="How can we work together?..." required rows="5" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none" />
                    <button type="submit" disabled={formStatus === 'submitting'} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-bold w-full shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                      <Briefcase size={18} />
                      {formStatus === 'submitting' ? 'Sending...' : 'Send Business Enquiry'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTENT MANAGER */}
        {activeSection === 'admin' && isOwner && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-white"><Settings className="text-white/40" /> Content Manager</h2>
            <div className="bg-black/60 border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">{newPost.id ? <Edit3 size={20} className="text-blue-400" /> : <Plus size={20} className="text-blue-400" />}{newPost.id ? "Edit Journal Entry" : "New Blog Entry"}</h3>
              <form onSubmit={handleSavePost} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div><label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Entry Title</label><input value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} type="text" required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
                  <div><label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Category</label><input value={newPost.tag} onChange={e => setNewPost({...newPost, tag: e.target.value})} type="text" required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
                </div>
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-2 flex items-center gap-2"><ImageIcon size={14}/> Image Settings</h4>
                  <div><label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Image URL</label><input value={newPost.img} onChange={e => setNewPost({...newPost, img: e.target.value})} type="text" placeholder="https://..." className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
                  {newPost.img && (
                    <div className="grid md:grid-cols-2 gap-8 pt-2">
                      <div><label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-4 px-1">Image Height: {newPost.imgHeight}px</label><input type="range" min="200" max="600" step="50" value={newPost.imgHeight} onChange={e => setNewPost({...newPost, imgHeight: parseInt(e.target.value)})} className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
                      <div><label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-3 px-1">Fit Mode</label><div className="flex gap-2">
                        <button type="button" onClick={() => setNewPost({...newPost, imgFit: 'cover'})} className={`flex-1 py-2 rounded-lg border transition-all ${newPost.imgFit === 'cover' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/40 border-white/10 text-white/40'}`}>Fill Frame</button>
                        <button type="button" onClick={() => setNewPost({...newPost, imgFit: 'contain'})} className={`flex-1 py-2 rounded-lg border transition-all ${newPost.imgFit === 'contain' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/40 border-white/10 text-white/40'}`}>Show Entire Image</button>
                      </div></div>
                    </div>
                  )}
                </div>
                <div><label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 px-1">Journal Content</label><textarea value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})} required rows="8" placeholder="Type your journal entry here..." className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none font-sans" /></div>
                <div className="flex gap-4"><button type="submit" className="flex-grow bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all">{newPost.id ? "Update Post" : "Post to Blog"}</button>{newPost.id && ( <button type="button" onClick={handleCancelEdit} className="px-8 py-4 rounded-xl font-bold bg-white/10 border border-white/10 hover:bg-white/20 transition-all">Cancel</button> )}</div>
              </form>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4 text-white/40 px-2">Manage Existing Entries</h3>
              {blogPosts.map((post, idx) => (
                <div key={`${post.id}-${idx}`} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center justify-between gap-4 group">
                  <div className="flex-grow"><h4 className="font-bold text-lg group-hover:text-blue-400 transition-colors">{post.title}</h4><p className="text-sm text-white/40">{post.date}</p></div>
                  <div className="flex gap-2"><button onClick={() => handleEditClick(post)} className="p-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="Edit Post"><Edit3 size={18} /></button><button onClick={() => handleDeletePost(post.id)} className="p-3 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600 hover:text-white transition-colors" title="Delete Post"><Trash2 size={18} /></button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIDEOS SECTION */}
        {activeSection === 'videos' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-6">
              <img src="https://iili.io/q3ui8a1.png" alt="ToneShift Logo" className="h-16 sm:h-28 object-contain drop-shadow-2xl" />
              <div className="flex items-center gap-5"><a href={safeExternalUrl("https://youtube.com/@maxmctavish", "#")} target="_blank" rel="noopener noreferrer" className="bg-white/10 border border-white/10 px-6 py-2.5 rounded-lg font-medium hover:bg-white/20 transition-colors">Visit Channel</a><a href={safeExternalUrl("https://youtube.com/@maxmctavish?sub_confirmation=1", "#")} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform active:scale-95"><img src="https://iili.io/q3WRHTN.png" alt="Subscribe" className="h-12 shadow-2xl" /></a></div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.filter((video) => !isYouTubeShort(video)).slice(0, 6).map((video, idx) => {
                const safeVideoUrl = safeExternalUrl(video.url, '#');
                const safeThumbnailUrl = safeExternalUrl(getVideoThumbnailUrl(video));
                return (
                  <a key={`${video.id}-${idx}`} href={safeVideoUrl} onClick={(e) => safeVideoUrl === '#' && e.preventDefault()} target="_blank" rel="noopener noreferrer" className="bg-black/60 rounded-xl border border-white/10 group hover:border-blue-500/50 transition-all flex flex-col shadow-xl p-6">
                    <div className="mb-4 -mx-1 rounded-lg overflow-hidden border border-white/10 bg-black/30 relative">
                      {safeThumbnailUrl ? (
                        <img src={safeThumbnailUrl} alt={video.title} loading="lazy" className="w-full aspect-video object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                      ) : (
                        <div className="w-full aspect-video flex items-center justify-center bg-black/50">
                          <Youtube size={36} className="text-red-500/80" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/55 border border-white/20 text-white text-sm font-semibold backdrop-blur-sm group-hover:scale-105 transition-transform">
                          <PlayCircle size={18} className="text-blue-400" />
                          Watch now
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mb-4">
                      <Youtube size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <h3 className="font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors text-lg leading-snug">{video.title}</h3>
                    </div>
                    <p className="text-sm text-white/50 line-clamp-3 mb-6 flex-grow">{video.description}</p>
                    <div className="text-sm font-bold text-blue-400 flex items-center mt-auto">Watch on YouTube <ChevronRight size={16} className="ml-1" /></div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sidebar Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl animate-in slide-in-from-right duration-300">
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-12"><span className="text-xl font-bold" style={{ fontFamily: "'Playwrite AU SA', cursive" }}>Menu</span><button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu"><X size={32}/></button></div>
            <div className="space-y-2 flex-grow overflow-y-auto">
              <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 px-2">Max Live</div>
              <NavItem section="bio" label="About Max" icon={User} />
              <NavItem section="gigs" label="Upcoming Gigs" icon={CalendarDays} />
              <NavItem section="venue-pack" label="Venue Pack" icon={Download} />
              <NavItem section="bookings" label="Bookings" icon={Mail} />
              <div className="h-px bg-white/10 my-6"></div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 px-2">ToneShift</div>
              <NavItem section="videos" label="YouTube Channel" icon={Youtube} />
              <NavItem section="news" label="Guitar Blog" icon={Newspaper} />
              <NavItem section="business" label="Business Enquiries" icon={Briefcase} />
              {isOwner && <NavItem section="admin" label="Manager" icon={Settings} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
