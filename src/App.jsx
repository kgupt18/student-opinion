import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import html2canvas from "html2canvas";

const GD = "#1B5E3B", BD = "#1B3F6E", YD = "#8B6914", RD = "#A32D2D";
const TOPICS = ["Economy","Elections","Foreign policy","Education","Healthcare","Civil rights","Environment","Campus issues"];
const BADGES = { verified:{bg:GD,l:"Verified"}, partial:{bg:BD,l:"Partially true"}, disputed:{bg:YD,l:"Disputed"}, unverified:{bg:RD,l:"Unverified"} };
const Badge = ({type,size="sm"}) => { const b=BADGES[type]; return <span style={{fontSize:size==="sm"?10:11,padding:size==="sm"?"2px 8px":"3px 10px",borderRadius:3,background:b.bg,color:"#fff",fontWeight:700,whiteSpace:"nowrap",letterSpacing:.3}}>{b.l}</span>; };

const TAKES = [
  {id:1,author:"Jake Morrison",initials:"JM",school:"Purdue University",time:"3h",topic:"Elections",badge:"verified",sourced:true,cred:92,title:"The case for ranked-choice voting in campus elections",body:"Our SGA elections consistently see 40% turnout with plurality winners capturing just 28% of votes cast. Ranked-choice systems at other universities have increased participation and produced more representative outcomes.",responses:14,factChecks:3},
  {id:2,author:"Priya Sharma",initials:"PS",school:"University of Michigan",time:"5h",topic:"Economy",badge:"partial",sourced:true,cred:94,title:"Student loan forgiveness isn't the progressive policy people think it is",body:"The median student loan borrower holds $28,950 in debt, but the highest balances belong to graduate and professional degree holders who earn well above median income. Broad forgiveness is regressive by design.",responses:31,factChecks:7},
  {id:3,author:"Marcus Williams",initials:"MW",school:"Howard University",time:"8h",topic:"Civil rights",badge:"verified",sourced:false,cred:88,title:"Why HBCUs are more relevant than ever in 2026",body:"With affirmative action struck down, HBCUs have seen a 20% increase in applications. These institutions aren't relics — they're becoming the primary pipeline for Black professionals in STEM, law, and medicine.",responses:22,factChecks:2},
  {id:4,author:"Anonymous",initials:"AN",school:"Indiana University",time:"12h",topic:"Campus issues",badge:"disputed",sourced:false,cred:null,title:"University administrators are failing on free speech",body:"Three speakers were disinvited from campus this semester alone. Whether you agree with their views or not, the pattern of institutional cowardice is unmistakable and corrosive to academic freedom.",responses:47,factChecks:11},
];

const QUESTIONS = [
  {id:10,author:"Taylor Kim",initials:"TK",school:"Purdue University",time:"1h",topic:"Elections",cred:76,title:"What should I know before voting in the 2026 midterms?",context:"I'm a sophomore and this will be my first time voting in a midterm.",answers:8},
  {id:11,author:"Anonymous",initials:"AN",school:"UCLA",time:"3h",topic:"Economy",cred:null,title:"What's the actual difference between a progressive tax and a flat tax?",context:"I keep hearing these terms but I don't fully understand the implications.",answers:5},
  {id:12,author:"Jordan Rivera",initials:"JR",school:"Georgetown",time:"6h",topic:"Foreign policy",cred:82,title:"Can someone explain the arguments for and against U.S. involvement in NATO?",context:"",answers:12},
  {id:13,author:"Amara Osei",initials:"AO",school:"Howard University",time:"9h",topic:"Healthcare",cred:90,title:"How does the U.S. healthcare system compare to single-payer models?",context:"I'm writing a paper and want real student perspectives beyond textbooks.",answers:3},
  {id:14,author:"Chris Novak",initials:"CN",school:"Ohio State",time:"1d",topic:"Campus issues",cred:71,title:"Should student government have actual budgetary power?",context:"Our SGA controls almost nothing. Is that the norm?",answers:0},
];

const ANSWERS = [
  {author:"Priya Sharma",initials:"PS",school:"U of Michigan",time:"45m",cred:94,badge:"verified",position:"Start with your local races — they affect you more directly.",reasoning:"Midterm turnout among 18-24 year olds was 23% in 2022. Your state legislators control tuition policy, housing regulation, and criminal justice reform that directly impacts students. Research your district's candidates on ballotpedia.org and check their voting records.",sources:["ballotpedia.org","census.gov — CPS Voting Supplement 2022"]},
  {author:"Daniel Okafor",initials:"DO",school:"Georgetown",time:"30m",cred:87,badge:"partial",position:"Focus on the issues, not the party labels.",reasoning:"Both major parties have internal factions that disagree on key issues. A Republican in Massachusetts is very different from one in Texas. Look at specific policy positions: where does each candidate stand on issues you care about? The League of Women Voters publishes nonpartisan voter guides for every district.",sources:["lwv.org — Voter Guide 2026"]},
];

const COUNTER_ARGS = [
  {author:"Mia Torres",initials:"MT",school:"Ohio State",time:"2h",cred:85,badge:"verified",addressing:"The claim that plurality winners capture just 28% of votes",position:"Accurate for Purdue but not universal.",reasoning:"At OSU, our student body president won with 23% in a five-candidate race. But schools with runoff systems (like Stanford) see winners with 55%+ support. The problem is specific to plurality voting without runoffs. RCV is one solution, but not the only one.",sources:["stanford.edu — ASSU election results 2024"]},
  {author:"Raj Patel",initials:"RP",school:"Purdue University",time:"1h",cred:79,badge:"partial",addressing:"The implied claim that RCV always increases participation",position:"RCV can decrease turnout short-term.",reasoning:"NYC's first citywide RCV election in 2021 showed significant ballot exhaustion — roughly 15% of ballots were exhausted before a winner was determined. The learning curve is real.",sources:["fairvote.org — NYC 2021 RCV analysis"]},
];

const sans = {fontFamily:"system-ui,-apple-system,sans-serif"};
const serif = {fontFamily:"'Times New Roman',Georgia,serif"};
const hd = (sz) => ({fontWeight:700,textDecoration:"underline",textDecorationThickness:2,textUnderlineOffset:5,...serif,fontSize:sz,fontStyle:"normal"});

// School detection from .edu domain
const EDU_SCHOOLS = {"purdue.edu":"Purdue University","umich.edu":"University of Michigan","howard.edu":"Howard University","indiana.edu":"Indiana University","ucla.edu":"UCLA","georgetown.edu":"Georgetown","osu.edu":"Ohio State University","stanford.edu":"Stanford University","harvard.edu":"Harvard University","mit.edu":"MIT","yale.edu":"Yale University","columbia.edu":"Columbia University","uchicago.edu":"University of Chicago","nyu.edu":"NYU","upenn.edu":"University of Pennsylvania","cornell.edu":"Cornell University","brown.edu":"Brown University"};
const detectSchool = (email) => { const d = email.split("@")[1]; if (!d) return ""; return EDU_SCHOOLS[d] || (d.endsWith(".edu") ? d.replace(".edu","").split(".").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ") : ""); };
const DEGREE_OPTIONS = ["Undergraduate","Master's","PhD","JD","MBA","Other Graduate"];

export default function App() {
  const [page, setPage] = useState("landing");
  const [section, setSection] = useState("qa");
  const [view, setView] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [feed, setFeed] = useState("general");
  const [topic, setTopic] = useState("All");
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeMode, setWriteMode] = useState("freeform");
  const [loginMode, setLoginMode] = useState("signup");
  const [expandRundown, setExpandRundown] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [verifyBanner, setVerifyBanner] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Signup profile fields (combined form)
  const [signupName, setSignupName] = useState("");
  const [signupSchool, setSignupSchool] = useState("");
  const [signupDegree, setSignupDegree] = useState("");
  const [signupMajor, setSignupMajor] = useState("");

  // Edit profile form
  const [editForm, setEditForm] = useState({ display_name:"", school:"", degree_program:"", major:"", grad_year:"", bio:"" });

  // Write form state
  const [writeForm, setWriteForm] = useState({ title:"", body:"", topic:"", context:"", source:"", anonymous:false, issue:"", take:"", why:"" });
  const resetWriteForm = () => setWriteForm({ title:"", body:"", topic:"", context:"", source:"", anonymous:false, issue:"", take:"", why:"" });

  // Answer form state
  const [answerForm, setAnswerForm] = useState({ position:"", reasoning:"", evidence:"" });

  // Counterargument form state
  const [counterForm, setCounterForm] = useState({ addressing:"", position:"", reasoning:"", evidence:"" });
  const [counterOpen, setCounterOpen] = useState(false);

  // Challenge form state
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ claim:"", badge:"", source:"", reason:"", postId:null, postType:"" });
  const [challengeCounts, setChallengeCounts] = useState({});

  // Inline question prompt state
  const [inlineQ, setInlineQ] = useState("");

  // User content from Supabase
  const [userTakes, setUserTakes] = useState([]);
  const [userQuestions, setUserQuestions] = useState([]);
  const [userStats, setUserStats] = useState({ takes:0, answers:0, questions:0 });

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Is email verified?
  const isVerified = session?.user?.email_confirmed_at != null;

  // Listen for auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setAuthLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
    setAuthLoading(false);
  };

  // After auth loads, route appropriately
  useEffect(() => {
    if (authLoading) return;
    if (session && page === "landing") { setPage("app"); setSection("qa"); if (!isVerified) setVerifyBanner(true); }
    if (session && page === "auth") { setPage("app"); setSection("qa"); }
    if (!session && page === "app") setPage("landing");
    if (!session && page !== "landing" && page !== "auth") setPage("landing");
  }, [authLoading, session]);

  // Auto-detect school from email
  useEffect(() => {
    if (loginMode === "signup" && authEmail) setSignupSchool(detectSchool(authEmail));
  }, [authEmail, loginMode]);

  const handleSignUp = async () => {
    setAuthError(null);
    if (authPassword.length < 6) { setAuthError("Password must be at least 6 characters"); return; }
    if (!signupName.trim()) { setAuthError("Please enter your display name"); return; }
    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (error) { setAuthError(error.message); return; }
    // Create profile immediately
    const userId = data.user?.id || data.session?.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId, email: authEmail,
        display_name: signupName.trim(),
        school: signupSchool.trim(),
        degree_program: signupDegree,
        major: signupMajor.trim(),
        credibility_score: 0,
      });
    }
    // Don't sign out — let the user straight in
    setVerifyBanner(true);
    // Route to most active Q&A thread
    const { data: topQ } = await supabase.from("questions").select("*").order("created_at",{ascending:false}).limit(1);
    if (topQ && topQ.length > 0) {
      setPage("app"); setSection("qa"); setView("q-detail"); setViewData(topQ[0]);
    } else {
      setPage("app"); setSection("qa");
    }
  };

  const handleLogin = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) { setAuthError(error.message); return; }
  };

  const handleResetPassword = async () => {
    setAuthError(null);
    if (!authEmail.trim()) { setAuthError("Please enter your email address"); return; }
    await supabase.auth.resetPasswordForEmail(authEmail.trim());
    setResetSent(true);
  };

  const handleResendVerification = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email: session?.user?.email || authEmail });
    if (error) alert("Error: " + error.message);
    else alert("Verification email resent! Check your inbox.");
  };

  // Check verification before publishing
  const requireVerified = () => {
    if (!isVerified) {
      alert("Verify your email to publish. Check your inbox or click 'Resend' in the verification banner.");
      return false;
    }
    return true;
  };

  const handleEditProfile = async () => {
    setAuthError(null);
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id, email: session.user.email,
      display_name: editForm.display_name, school: editForm.school,
      degree_program: editForm.degree_program, major: editForm.major,
      grad_year: editForm.grad_year, bio: editForm.bio,
      credibility_score: profile?.credibility_score ?? 0,
    });
    if (error) { setAuthError(error.message); return; }
    await loadProfile(session.user.id);
    setEditOpen(false);
  };

  const openEditProfile = () => {
    setEditForm({
      display_name: profile?.display_name || "",
      school: profile?.school || "",
      degree_program: profile?.degree_program || "",
      major: profile?.major || "",
      grad_year: profile?.grad_year || "",
      bio: profile?.bio || "",
    });
    setAuthError(null);
    setEditOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setProfile(null);
    setVerifyBanner(false);
    setPage("landing");
  };

  // Fetch user content from Supabase
  const loadUserContent = async (userId) => {
    const [takesRes, questionsRes, answersRes] = await Promise.all([
      supabase.from("takes").select("*").eq("author_id", userId).order("created_at",{ascending:false}),
      supabase.from("questions").select("*").eq("author_id", userId).order("created_at",{ascending:false}),
      supabase.from("answers").select("id").eq("author_id", userId),
    ]);
    setUserTakes(takesRes.data || []);
    setUserQuestions(questionsRes.data || []);
    setUserStats({
      takes: (takesRes.data||[]).length,
      questions: (questionsRes.data||[]).length,
      answers: (answersRes.data||[]).length,
    });
  };

  useEffect(() => {
    if (session && profile) loadUserContent(session.user.id);
  }, [session, profile]);

  // Notifications
  const loadNotifications = async () => {
    if (!session) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20);
    setNotifications(data || []);
  };

  useEffect(() => {
    if (session) loadNotifications();
  }, [session]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const markAllRead = async () => {
    if (!session || unreadCount === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", session.user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markOneRead = async (id) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleNotifClick = (n) => {
    markOneRead(n.id);
    setNotifOpen(false);
    if (n.post_type === "question") { setSection("qa"); setView("q-detail"); }
    else { setSection("forum"); setView("take-detail"); }
    // We need to load the post data — for now navigate with the id
    setViewData({ id: n.post_id, title: "Loading...", body: "", author: "", initials: "?", school: "", time: "", topic: "", badge: "verified", sourced: false, cred: null, responses: 0, factChecks: 0, answers: 0 });
  };

  // Submit write form (takes or questions) — requires verification
  const handleWriteSubmit = async () => {
    if (!session || !requireVerified()) return;
    if (section === "qa") {
      if (!writeForm.title.trim() || !writeForm.topic) { setAuthError("Please fill in your question and select a topic."); return; }
      const { error } = await supabase.from("questions").insert({
        author_id: session.user.id, title: writeForm.title.trim(),
        context: writeForm.context.trim() || null, topic: writeForm.topic,
        is_anonymous: writeForm.anonymous,
      });
      if (error) { alert("Error: " + error.message); return; }
    } else {
      const body = writeMode === "guided" ? [writeForm.issue, writeForm.take, writeForm.why].filter(Boolean).join("\n\n") : writeForm.body;
      if (!writeForm.title.trim() || !body.trim() || !writeForm.topic) { setAuthError("Please fill in all required fields and select a topic."); return; }
      if (wc(body) < 150) { setAuthError("Your take needs at least 150 words."); return; }
      const { error } = await supabase.from("takes").insert({
        author_id: session.user.id, title: writeForm.title.trim(), body: body.trim(),
        topic: writeForm.topic, is_anonymous: writeForm.anonymous, sourced: !!writeForm.source.trim(),
      });
      if (error) { alert("Error: " + error.message); return; }
    }
    setWriteOpen(false); resetWriteForm(); loadUserContent(session.user.id);
  };

  // Submit answer — requires verification
  const handleAnswerSubmit = async (questionId) => {
    if (!session || !requireVerified()) return;
    if (!answerForm.position.trim() || !answerForm.reasoning.trim()) { alert("Please fill in your position and reasoning."); return; }
    if (wc(answerForm.reasoning) < 100) { alert("Your reasoning needs at least 100 words."); return; }
    const { error } = await supabase.from("answers").insert({
      question_id: questionId, author_id: session.user.id,
      position: answerForm.position.trim(), reasoning: answerForm.reasoning.trim(),
      evidence: answerForm.evidence.trim() || null,
    });
    if (error) { alert("Error: " + error.message); return; }
    // Notify question author (if not self)
    const { data: q } = await supabase.from("questions").select("author_id").eq("id", questionId).single();
    if (q && q.author_id !== session.user.id) {
      await supabase.from("notifications").insert({
        user_id: q.author_id, type: "answer",
        message: `${profile?.display_name || "Someone"} answered your question`,
        post_id: questionId, post_type: "question",
      });
    }
    setAnswerForm({ position:"", reasoning:"", evidence:"" });
    alert("Answer submitted!"); loadUserContent(session.user.id);
  };

  // Submit counterargument — requires verification
  const handleCounterSubmit = async (takeId) => {
    if (!session || !requireVerified()) return;
    if (!counterForm.addressing.trim() || !counterForm.position.trim() || !counterForm.reasoning.trim()) { alert("Please fill in all required fields."); return; }
    if (wc(counterForm.reasoning) < 100) { alert("Your reasoning needs at least 100 words."); return; }
    const { error } = await supabase.from("counterarguments").insert({
      take_id: takeId, author_id: session.user.id,
      addressing: counterForm.addressing.trim(), position: counterForm.position.trim(),
      reasoning: counterForm.reasoning.trim(), evidence: counterForm.evidence.trim() || null,
    });
    if (error) { alert("Error: " + error.message); return; }
    // Notify take author (if not self)
    const { data: t } = await supabase.from("takes").select("author_id").eq("id", takeId).single();
    if (t && t.author_id !== session.user.id) {
      await supabase.from("notifications").insert({
        user_id: t.author_id, type: "counterargument",
        message: `${profile?.display_name || "Someone"} responded to your take`,
        post_id: takeId, post_type: "take",
      });
    }
    setCounterForm({ addressing:"", position:"", reasoning:"", evidence:"" });
    setCounterOpen(false); alert("Counterargument submitted!"); loadUserContent(session.user.id);
  };

  // Submit inline question from Q&A thread — requires verification
  const handleInlineQuestion = async (topicHint) => {
    if (!session || !requireVerified()) return;
    if (!inlineQ.trim()) return;
    const { error } = await supabase.from("questions").insert({
      author_id: session.user.id, title: inlineQ.trim(), topic: topicHint, is_anonymous: false,
    });
    if (error) { alert("Error: " + error.message); return; }
    setInlineQ(""); alert("Question posted!"); loadUserContent(session.user.id);
  };

  // Challenge system
  const openChallenge = (claim, badge, postId, postType) => {
    setChallengeForm({ claim, badge, source:"", reason:"", postId, postType });
    setChallengeOpen(true);
  };

  const handleChallengeSubmit = async () => {
    if (!session || !requireVerified()) return;
    if (!challengeForm.source.trim()) { alert("Please provide a source URL."); return; }
    const { error } = await supabase.from("challenges").insert({
      challenger_id: session.user.id,
      post_id: challengeForm.postId,
      post_type: challengeForm.postType,
      claim_text: challengeForm.claim,
      source_url: challengeForm.source.trim(),
      original_badge: challengeForm.badge,
    });
    if (error) { alert("Error: " + error.message); return; }
    // Notify post author
    const table = challengeForm.postType === "question" ? "questions" : "takes";
    const { data: post } = await supabase.from(table).select("author_id").eq("id", challengeForm.postId).single();
    if (post && post.author_id !== session.user.id) {
      await supabase.from("notifications").insert({
        user_id: post.author_id, type: "challenge",
        message: `${profile?.display_name || "Someone"} challenged a fact-check on your post`,
        post_id: challengeForm.postId, post_type: challengeForm.postType,
      });
    }
    setChallengeOpen(false);
    setChallengeForm({ claim:"", badge:"", source:"", reason:"", postId:null, postType:"" });
    alert("Challenge submitted. We'll review this with your source.");
    loadChallengeCounts();
  };

  const loadChallengeCounts = async () => {
    const { data } = await supabase.from("challenges").select("post_id");
    if (!data) return;
    const counts = {};
    data.forEach(c => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
    setChallengeCounts(counts);
  };

  useEffect(() => { loadChallengeCounts(); }, []);

  // Share card system
  const [shareOpen, setShareOpen] = useState(false);
  const [shareType, setShareType] = useState(null); // 'post' or 'credibility'
  const [shareData, setShareData] = useState(null);
  const shareRef = useRef(null);

  const openSharePost = (post, postType) => {
    setShareData({ ...post, postType });
    setShareType("post");
    setShareOpen(true);
  };

  const openShareCredibility = () => {
    setShareType("credibility");
    setShareOpen(true);
  };

  const captureCard = async () => {
    if (!shareRef.current) return null;
    const canvas = await html2canvas(shareRef.current, { scale: 2, backgroundColor: "#fff" });
    return canvas;
  };

  const handleDownloadCard = async () => {
    const canvas = await captureCard();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `student-opinion-${shareType === "credibility" ? "credential" : "post"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopyCard = async () => {
    const canvas = await captureCard();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        alert("Card copied to clipboard!");
      } catch { alert("Copy failed — try Download instead."); }
    }, "image/png");
  };

  const pInitials = profile?.display_name ? profile.display_name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) : "?";

  const go = (p) => { setPage(p); setView(null); setViewData(null); setWriteOpen(false); setAuthError(null); setNotifOpen(false); };
  const goSection = (s) => { setSection(s); setView(null); setViewData(null); setWriteOpen(false); setNotifOpen(false); };
  const tryWrite = () => setWriteOpen(true);

  const s = {
    page: {...sans,minHeight:"100vh",background:"#E8E6E0",color:"#111"},
    nav: {position:"sticky",top:0,zIndex:50,background:"#0A0A0A",borderBottom:"3px solid #222"},
    navIn: {maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,padding:"0 28px",gap:8},
    logo: {...serif,fontSize:18,fontWeight:700,textDecoration:"underline",textDecorationThickness:2,textUnderlineOffset:5,cursor:"pointer",color:"#fff",fontStyle:"normal",whiteSpace:"nowrap",flexShrink:0},
    navR: {display:"flex",alignItems:"center",gap:6,flexShrink:0},
    nt: (a) => ({fontSize:10,padding:"8px 12px",color:a?"#fff":"rgba(255,255,255,.5)",cursor:"pointer",...sans,fontWeight:a?700:400,letterSpacing:.5,textTransform:"uppercase",background:a?"#333":"transparent",borderRadius:4,whiteSpace:"nowrap",transition:"color .15s, background .15s"}),
    av: {width:28,height:28,borderRadius:"50%",background:"#333",border:"2px solid #555",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,...sans,cursor:"pointer",marginLeft:4,flexShrink:0},
    main: {maxWidth:960,margin:"0 auto",padding:"0 28px 80px"},
    card: {background:"#FFFFFF",border:"1px solid #D0CEC7",borderRadius:6,padding:"20px 24px",marginBottom:12,cursor:"pointer",transition:"border-color .15s, box-shadow .15s"},
    btn: (f) => ({fontSize:12,padding:"9px 22px",borderRadius:4,border:f?"none":"1px solid #AAA",background:f?"#111":"transparent",color:f?"#fff":"#555",cursor:"pointer",...sans,fontWeight:700,letterSpacing:.3,transition:"opacity .15s"}),
    sl: {fontSize:10,letterSpacing:2.5,color:"#555",margin:"20px 0 10px",textTransform:"uppercase",...sans,fontWeight:700},
    topBar: {display:"flex",alignItems:"center",gap:12,padding:"16px 0 14px",flexWrap:"wrap"},
    toggle: (a) => ({fontSize:11,padding:"5px 14px",background:a?"#111":"#E8E6E0",color:a?"#fff":"#555",border:"none",cursor:"pointer",...sans,fontWeight:a?700:500,letterSpacing:.3,borderRadius:3,transition:"background .15s, color .15s"}),
    select: {fontSize:12,padding:"6px 12px",border:"1px solid #C5C3BC",borderRadius:4,background:"#FFFFFF",color:"#555",...sans,fontWeight:500,cursor:"pointer"},
    input: {width:"100%",padding:"10px 12px",border:"1px solid #333",borderRadius:4,background:"#111",color:"#fff",fontSize:13,...sans,boxSizing:"border-box"},
    inputLight: {width:"100%",padding:"10px 12px",border:"1px solid #D0CEC7",borderRadius:4,background:"#fff",color:"#111",fontSize:13,...sans,boxSizing:"border-box"},
  };

  // Word count helper
  const wc = (text) => text.trim() ? text.trim().split(/\s+/).length : 0;
  const WordCount = ({text, min}) => { const c = wc(text); const met = c >= min; return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:8}}>
      <span style={{fontSize:11,color:met?GD:"#888",...sans,fontWeight:600}}>{c} / {min} words</span>
      {c > 0 && !met && <span style={{fontSize:11,color:"#C33",...sans}}>Minimum {min} words required</span>}
    </div>
  );};

  const Avatar = ({initials,size=26,anon=false}) => <div style={{width:size,height:size,borderRadius:"50%",background:anon?"#999":"#1A1A1A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,color:"#fff",fontWeight:700,...sans,flexShrink:0}}>{initials}</div>;
  const Cred = ({score}) => score ? <span style={{fontSize:11,color:"#555",fontWeight:600,...sans}}>{score}%</span> : null;

  // Sidebar label style
  const sbl = {fontSize:10,letterSpacing:2,color:"#888",margin:"0 0 8px",textTransform:"uppercase",...sans,fontWeight:700};

  // Trending: top posts by answer/response count
  const trendingItems = [...QUESTIONS,...TAKES].sort((a,b)=>(b.answers||b.responses||0)-(a.answers||a.responses||0)).slice(0,4);

  const Sidebar = () => (
    <aside className="sidebar" style={{width:260,flexShrink:0,background:"#F0EEE8",borderRight:"1px solid #D0CEC7",padding:"20px 20px 28px",position:"sticky",top:52,height:"calc(100vh - 52px)",overflowY:"auto",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:0}}>
      {/* Feed toggle */}
      <div style={{marginBottom:20}}>
        {["general","campus"].map(f=>(
          <button key={f} onClick={()=>{setFeed(f);setSidebarOpen(false)}} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",marginBottom:4,borderRadius:4,border:"none",background:feed===f?"#111":"transparent",color:feed===f?"#fff":"#555",cursor:"pointer",...sans,fontSize:12,fontWeight:feed===f?700:500,transition:"background .15s, color .15s"}}>{f==="general"?"General":"My Campus"}</button>
        ))}
      </div>

      {/* Topics */}
      <p style={sbl}>Topics</p>
      <div style={{marginBottom:20}}>
        {["All",...TOPICS].map(t=>(
          <div key={t} onClick={()=>{setTopic(t==="All"?"All":t);setSidebarOpen(false)}} style={{padding:"6px 12px",marginBottom:2,borderRadius:4,cursor:"pointer",fontSize:12,color:topic===(t==="All"?"All":t)?"#111":"#555",fontWeight:topic===(t==="All"?"All":t)?700:400,background:topic===(t==="All"?"All":t)?"rgba(0,0,0,.06)":"transparent",...sans,transition:"background .15s"}}>{t}</div>
        ))}
      </div>

      {/* Trending */}
      <p style={sbl}>Trending now</p>
      <div style={{marginBottom:20}}>
        {trendingItems.map(t=>{const isQ=t.answers!=null; return (
          <div key={t.id} onClick={()=>{setSection(isQ?"qa":"forum");setView(isQ?"q-detail":"take-detail");setViewData(t);setSidebarOpen(false)}} style={{padding:"6px 0",cursor:"pointer",borderBottom:"1px solid #E2E0DA",transition:"background .1s",borderRadius:3}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,.04)";e.currentTarget.querySelector('.trend-title').style.color="#111"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.querySelector('.trend-title').style.color="#333"}}>
            <p className="trend-title" style={{fontSize:12,color:"#333",margin:0,lineHeight:1.4,...sans,fontWeight:500,transition:"color .1s"}}>{t.title.length>55?t.title.slice(0,55)+"...":t.title}</p>
            <p style={{fontSize:10,color:"#888",margin:"2px 0 0",...sans}}>{isQ?`${t.answers} answers`:`${t.responses} responses`}</p>
          </div>
        );})}
      </div>

      {/* Your stats */}
      {session && profile && <>
        <p style={sbl}>Your stats</p>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,...sans}}>
            <span style={{color:"#555"}}>Credibility</span><span style={{color:"#111",fontWeight:700}}>{profile.credibility_score??0}%</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,...sans}}>
            <span style={{color:"#555"}}>Takes</span><span style={{color:"#111",fontWeight:600}}>{userStats.takes}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,...sans}}>
            <span style={{color:"#555"}}>Answers</span><span style={{color:"#111",fontWeight:600}}>{userStats.answers}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,...sans}}>
            <span style={{color:"#555"}}>Questions</span><span style={{color:"#111",fontWeight:600}}>{userStats.questions}</span>
          </div>
        </div>
      </>}

      {/* Write button */}
      <div style={{marginTop:"auto"}}>
        <button style={{...s.btn(true),width:"100%",padding:"10px 0",fontSize:12}} onClick={()=>{tryWrite();setSidebarOpen(false)}}>{section==="qa"?"Ask a question":"Write a take"}</button>
      </div>
    </aside>
  );

  // ========== LANDING (SHORT HOOK + EXPANDABLE) ==========
  const LandingPage = () => (
    <div style={{minHeight:"100vh",background:"#0A0A0A",color:"#fff"}}>
      {/* Sticky top bar with CTA always visible */}
      <div style={{position:"sticky",top:0,zIndex:50,background:"#0A0A0A",borderBottom:"1px solid #222"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 28px",maxWidth:960,margin:"0 auto"}}>
          <span style={{...serif,fontSize:18,fontWeight:700,textDecoration:"underline",textDecorationThickness:2,textUnderlineOffset:5,fontStyle:"normal"}}>The Student Opinion</span>
          <div style={{display:"flex",gap:10}}>
            <button style={{fontSize:12,padding:"7px 18px",borderRadius:4,border:"1px solid #444",background:"transparent",color:"#fff",cursor:"pointer",...sans,fontWeight:600}} onClick={()=>{setLoginMode("login");go("auth")}}>Log in</button>
            <button style={{fontSize:12,padding:"7px 18px",borderRadius:4,border:"none",background:"#fff",color:"#111",cursor:"pointer",...sans,fontWeight:700}} onClick={()=>{setLoginMode("signup");go("auth")}}>Sign up free</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"0 24px"}}>
        {/* ABOVE THE FOLD — hook + CTA in first viewport */}
        <div style={{textAlign:"center",padding:"64px 0 48px"}}>
          <h1 style={{...hd(40),color:"#fff",margin:"0 0 14px",textDecorationColor:"#fff",textDecorationThickness:3}}>The Student Opinion</h1>
          <p style={{fontSize:18,color:"rgba(255,255,255,.55)",margin:"0 0 32px",...sans,lineHeight:1.6}}>Fact-checked political discourse for college students.</p>

          {/* Three pillars — one line each */}
          <div style={{display:"grid",gap:10,marginBottom:36,textAlign:"left"}}>
            {[{color:GD,title:"The Forum",one:"Structured opinion pieces, fact-checked by AI."},
              {color:BD,title:"The Q&A",one:"Ask political questions, get evidence-backed answers."},
              {color:YD,title:"Live Debates",one:"Real-time voice debates with live fact-checking."}
            ].map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:14,background:"#141414",border:"1px solid #252525",borderRadius:6,padding:"14px 18px"}}>
                <div style={{width:32,height:32,borderRadius:6,background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0}}>{i+1}</div>
                <div>
                  <span style={{...serif,fontSize:15,fontWeight:700,fontStyle:"normal"}}>{p.title}</span>
                  <span style={{fontSize:13,color:"rgba(255,255,255,.5)",marginLeft:8,...sans}}>{p.one}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA — above the fold */}
          <button style={{fontSize:15,padding:"14px 40px",borderRadius:4,border:"none",background:"#fff",color:"#111",cursor:"pointer",...sans,fontWeight:700,marginBottom:8}} onClick={()=>{setLoginMode("signup");go("auth")}}>Sign up with your .edu email</button>
          <p style={{fontSize:12,color:"rgba(255,255,255,.5)",margin:"8px 0 0",...sans}}>Free. Only verified college students.</p>
        </div>

        {/* BELOW THE FOLD — expandable detail */}
        <div style={{borderTop:"1px solid #252525",paddingTop:32,paddingBottom:80}}>
          <button onClick={()=>setExpandRundown(!expandRundown)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer",...sans,fontSize:13,fontWeight:600,padding:0,marginBottom:expandRundown?20:0}}>
            <span style={{transform:expandRundown?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s",display:"inline-block"}}>▶</span>
            {expandRundown?"Hide details":"How does it work? Read the full rundown"}
          </button>

          {expandRundown && <>
            {/* Detailed pillar explanations */}
            {[{icon:"1",color:GD,title:"The Forum",sub:"Read and write structured political arguments",desc:"Students publish Takes — sourced, fact-checked opinion pieces. Others respond with Counterarguments that must engage with specific claims and evidence. Every factual claim is annotated by AI."},
              {icon:"2",color:BD,title:"The Q&A",sub:"Ask questions, get evidence-backed answers",desc:"Don't know something? Ask. Other students answer with structured responses: their position, their reasoning, and their evidence. Answers are fact-checked. Multiple perspectives on every question."},
              {icon:"3",color:YD,title:"Live Debates",sub:"Real-time voice discussions, fact-checked on the fly",desc:"Join voice rooms where students debate. When someone makes a factual claim, the AI evaluates it and shows the verdict to everyone in real time. Coming soon."}
            ].map((p,i)=>(
              <div key={i} style={{display:"flex",gap:16,marginBottom:14,background:"#141414",border:"1px solid #252525",borderRadius:6,padding:"20px 22px"}}>
                <div style={{width:40,height:40,borderRadius:8,background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0}}>{p.icon}</div>
                <div>
                  <h3 style={{...serif,fontSize:17,fontWeight:700,margin:"0 0 2px",fontStyle:"normal"}}>{p.title}</h3>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.55)",margin:"0 0 8px",...sans}}>{p.sub}</p>
                  <p style={{fontSize:13,color:"rgba(255,255,255,.55)",margin:0,lineHeight:1.55,...sans}}>{p.desc}</p>
                </div>
              </div>
            ))}

            {/* Fact-checking */}
            <div style={{background:"#141414",border:"1px solid #252525",borderRadius:6,padding:"20px 22px",marginBottom:14}}>
              <h3 style={{...serif,fontSize:16,fontWeight:700,margin:"0 0 10px",fontStyle:"normal"}}>How fact-checking works</h3>
              <p style={{fontSize:13,color:"rgba(255,255,255,.55)",margin:"0 0 14px",lineHeight:1.55,...sans}}>The AI evaluates verifiable factual claims — not opinions. "I think rent control is good" is left alone. "Rent control reduced housing supply by 15%" gets checked. Every judgment is transparent and challengeable.</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{Object.entries(BADGES).map(([k])=><Badge key={k} type={k} size="md" />)}</div>
              <p style={{fontSize:12,color:"rgba(255,255,255,.5)",margin:0,...sans}}>Each badge expands to show sources. Disagree? Challenge it with your own source.</p>
            </div>

            {/* Credibility */}
            <div style={{background:"#141414",border:"1px solid #252525",borderRadius:6,padding:"20px 22px",marginBottom:14}}>
              <h3 style={{...serif,fontSize:16,fontWeight:700,margin:"0 0 8px",fontStyle:"normal"}}>Your credibility score</h3>
              <p style={{fontSize:13,color:"rgba(255,255,255,.55)",margin:0,lineHeight:1.55,...sans}}>Every factual claim builds your credibility — a percentage based on accuracy across all posts, answers, and debates. Visible next to your name. Recoverable if the AI makes a mistake.</p>
            </div>

            {/* Accuracy disclaimer */}
            <div style={{background:"#141414",border:"1px solid #444",borderRadius:6,padding:"18px 22px",marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:18,height:18,borderRadius:"50%",border:"2px solid #888",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#888",fontWeight:700}}>!</div>
                <p style={{fontSize:11,color:"#fff",margin:0,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",...sans}}>A note on accuracy</p>
              </div>
              <p style={{fontSize:13,color:"rgba(255,255,255,.55)",margin:0,lineHeight:1.55,...sans}}>AI fact-checking is imperfect. Labels are starting points, not verdicts. Examine the sources, think critically, and challenge anything you believe is wrong.</p>
            </div>

            {/* Second CTA */}
            <div style={{textAlign:"center"}}>
              <button style={{fontSize:14,padding:"13px 36px",borderRadius:4,border:"none",background:"#fff",color:"#111",cursor:"pointer",...sans,fontWeight:700}} onClick={()=>{setLoginMode("signup");go("auth")}}>Sign up free</button>
            </div>
          </>}
        </div>
      </div>
    </div>
  );

  // ========== AUTH ==========
  const lbl = {fontSize:12,color:"rgba(255,255,255,.6)",margin:"0 0 5px",...sans,fontWeight:600};
  const AuthPage = () => (
    <div style={{minHeight:"100vh",background:"#0A0A0A",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 0"}}>
      <div style={{maxWidth:loginMode==="signup"?440:400,width:"100%",padding:"0 24px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <h1 style={{...hd(28),color:"#fff",margin:"0 0 6px",textDecorationColor:"#fff"}}>The Student Opinion</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,.5)",margin:0,...sans}}>{loginMode==="signup"?"Create your account":loginMode==="forgot"?"Reset your password":"Welcome back"}</p>
        </div>
        <div style={{background:"#141414",border:"1px solid #252525",borderRadius:6,padding:"28px 24px"}}>
          {loginMode!=="forgot" && <div style={{display:"flex",background:"#0A0A0A",borderRadius:4,overflow:"hidden",marginBottom:20}}>
            <button style={{flex:1,fontSize:12,padding:"8px",border:"none",background:loginMode==="signup"?"#333":"transparent",color:loginMode==="signup"?"#fff":"#666",cursor:"pointer",...sans,fontWeight:600}} onClick={()=>{setLoginMode("signup");setAuthError(null);setResetSent(false)}}>Sign up</button>
            <button style={{flex:1,fontSize:12,padding:"8px",border:"none",background:loginMode==="login"?"#333":"transparent",color:loginMode==="login"?"#fff":"#666",cursor:"pointer",...sans,fontWeight:600}} onClick={()=>{setLoginMode("login");setAuthError(null);setResetSent(false)}}>Log in</button>
          </div>}
          {authError && <p style={{fontSize:12,color:"#E55",margin:"0 0 14px",background:"rgba(255,0,0,.1)",padding:"8px 12px",borderRadius:4,...sans}}>{authError}</p>}
          {loginMode==="forgot" ? (
            resetSent ? <>
              <p style={{fontSize:14,color:"rgba(255,255,255,.7)",margin:"0 0 16px",lineHeight:1.6,...sans}}>If an account exists with that email, we've sent a password reset link. Check your inbox (or spam folder).</p>
              <p style={{fontSize:12,textAlign:"center",margin:0,...sans}}>
                <span style={{color:"rgba(255,255,255,.5)",cursor:"pointer"}} onClick={()=>{setLoginMode("login");setResetSent(false);setAuthError(null)}}>← Back to login</span>
              </p>
            </> : <>
              <p style={lbl}>Email</p>
              <input placeholder="you@university.edu" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} style={{...s.input,marginBottom:16}} />
              <button style={{...s.btn(true),width:"100%",padding:"11px 0",background:"#fff",color:"#111"}} onClick={handleResetPassword}>Send reset link</button>
              <p style={{fontSize:12,margin:"16px 0 0",textAlign:"center",...sans}}>
                <span style={{color:"rgba(255,255,255,.5)",cursor:"pointer"}} onClick={()=>{setLoginMode("login");setAuthError(null)}}>← Back to login</span>
              </p>
            </>
          ) : <>
            <p style={lbl}>Email</p>
            <input placeholder="you@university.edu" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} style={{...s.input,marginBottom:12}} />
            <p style={lbl}>Password</p>
            <input type="password" placeholder="••••••••" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} style={{...s.input,marginBottom:loginMode==="signup"?12:8}} />
            {loginMode==="login" && <p style={{fontSize:11,margin:"0 0 14px",textAlign:"right",...sans}}>
              <span style={{color:"rgba(255,255,255,.5)",cursor:"pointer"}} onClick={()=>{setLoginMode("forgot");setAuthError(null);setResetSent(false)}}>Forgot password?</span>
            </p>}
            {loginMode==="signup" && <>
              <p style={lbl}>Display name</p>
              <input placeholder="Your name" value={signupName} onChange={e=>setSignupName(e.target.value)} style={{...s.input,marginBottom:12}} />
              <p style={lbl}>School</p>
              <input placeholder="e.g. Purdue University" value={signupSchool} onChange={e=>setSignupSchool(e.target.value)} style={{...s.input,marginBottom:12}} />
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                <div style={{flex:1}}>
                  <p style={lbl}>Degree program</p>
                  <select value={signupDegree} onChange={e=>setSignupDegree(e.target.value)} style={{...s.input,padding:"9px 10px",cursor:"pointer"}}>
                    <option value="">Select...</option>
                    {DEGREE_OPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <p style={lbl}>Major</p>
                  <input placeholder="e.g. Political Science" value={signupMajor} onChange={e=>setSignupMajor(e.target.value)} style={s.input} />
                </div>
              </div>
            </>}
            <button style={{...s.btn(true),width:"100%",padding:"11px 0",background:"#fff",color:"#111"}} onClick={loginMode==="signup"?handleSignUp:handleLogin}>{loginMode==="signup"?"Create account":"Sign in"}</button>
            <p style={{fontSize:12,margin:"16px 0 0",textAlign:"center",...sans}}>
              <span style={{color:"rgba(255,255,255,.5)",cursor:"pointer"}} onClick={()=>go("landing")}>← Back</span>
            </p>
          </>}
        </div>
      </div>
    </div>
  );

  // ========== EDIT PROFILE MODAL ==========
  const editFields = [["display_name","Display name"],["school","School"],["major","Major"],["grad_year","Graduation year"],["bio","Short bio"]];
  const EditProfileModal = () => (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.65)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={e=>{if(e.target===e.currentTarget)setEditOpen(false)}}>
      <div style={{background:"#FFFFFF",borderRadius:8,maxWidth:480,width:"100%",maxHeight:"85vh",overflow:"auto",padding:"28px 32px",position:"relative"}}>
        <h2 style={{...serif,fontSize:20,fontWeight:700,margin:"0 0 4px",color:"#111",fontStyle:"normal"}}>Edit profile</h2>
        <p style={{fontSize:13,color:"#666",margin:"0 0 20px",...sans}}>Update your information anytime.</p>
        {authError && <p style={{fontSize:12,color:"#C33",margin:"0 0 14px",background:"rgba(255,0,0,.06)",padding:"8px 12px",borderRadius:4,...sans}}>{authError}</p>}
        {editFields.slice(0,2).map(([key,label])=>(
          <div key={key} style={{marginBottom:12}}>
            <p style={{fontSize:12,color:"#333",margin:"0 0 4px",...sans,fontWeight:600}}>{label}</p>
            <input value={editForm[key]} onChange={e=>setEditForm(f=>({...f,[key]:e.target.value}))} style={s.inputLight} />
          </div>
        ))}
        <div style={{marginBottom:12}}>
          <p style={{fontSize:12,color:"#333",margin:"0 0 4px",...sans,fontWeight:600}}>Degree program</p>
          <select value={editForm.degree_program} onChange={e=>setEditForm(f=>({...f,degree_program:e.target.value}))} style={{...s.select,width:"100%"}}>
            <option value="">Select...</option>
            {DEGREE_OPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {editFields.slice(2,4).map(([key,label])=>(
          <div key={key} style={{marginBottom:12}}>
            <p style={{fontSize:12,color:"#333",margin:"0 0 4px",...sans,fontWeight:600}}>{label}</p>
            <input value={editForm[key]} onChange={e=>setEditForm(f=>({...f,[key]:e.target.value}))} style={s.inputLight} />
          </div>
        ))}
        <p style={{fontSize:12,color:"#333",margin:"0 0 4px",...sans,fontWeight:600}}>Short bio</p>
        <textarea rows={2} value={editForm.bio} onChange={e=>setEditForm(f=>({...f,bio:e.target.value}))} placeholder="What are you interested in?" style={{...s.inputLight,resize:"vertical",marginBottom:16}} />
        <button style={{...s.btn(true),width:"100%",padding:"11px 0"}} onClick={handleEditProfile}>Save changes</button>
      </div>
    </div>
  );

  // ========== VERIFY BANNER ==========
  const VerifyBanner = () => !isVerified && verifyBanner ? (
    <div style={{background:"#1A1A1A",padding:"10px 20px",borderRadius:6,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <p style={{fontSize:13,color:"rgba(255,255,255,.7)",margin:0,...sans}}>Verify your email within 48 hours to keep your account. <span style={{color:"rgba(255,255,255,.5)"}}>Check your inbox (or spam folder).</span></p>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button style={{fontSize:11,padding:"5px 12px",borderRadius:3,border:"1px solid #555",background:"transparent",color:"rgba(255,255,255,.6)",cursor:"pointer",...sans,fontWeight:600}} onClick={handleResendVerification}>Resend</button>
        <span style={{fontSize:16,color:"rgba(255,255,255,.5)",cursor:"pointer"}} onClick={()=>setVerifyBanner(false)}>×</span>
      </div>
    </div>
  ) : null;

  // ========== CONTEXTUAL PROMPT (inline in feed) ==========
  const ContextualPrompt = ({topicHint}) => (
    <div style={{background:"#FFFFFF",border:"1px dashed #C5C3BC",borderRadius:6,padding:"16px 20px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
      <p style={{fontSize:13,color:"#555",margin:0,...sans}}>
        Curious about <span style={{fontWeight:700,color:"#111"}}>{topicHint}</span>? Ask your own question.
      </p>
      <button style={{...s.btn(true),fontSize:11,padding:"7px 16px"}} onClick={()=>{setSection("qa");tryWrite()}}>Ask a question</button>
    </div>
  );

  // ========== POST CARDS ==========
  const TakeCard = ({post,type="take"}) => (
    <div style={s.card} onClick={()=>{setView(type==="take"?"take-detail":"q-detail");setViewData(post)}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#999";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.06)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#D0CEC7";e.currentTarget.style.boxShadow="none"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <Avatar initials={post.initials} anon={post.author==="Anonymous"} />
        <span style={{fontSize:12,fontWeight:700,color:"#111"}}>{post.author}</span>
        {post.cred && <Cred score={post.cred} />}
        <span style={{fontSize:11,color:"#666"}}>{post.school}</span>
        <span style={{fontSize:11,color:"#888"}}>·</span>
        <span style={{fontSize:11,color:"#666"}}>{post.time} ago</span>
        {post.badge && <span style={{marginLeft:"auto"}}><Badge type={post.badge} /></span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,background:type==="take"?"#C8C6BF":"#B8CBE0",color:type==="take"?"#555":BD,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{type==="take"?"Take":"Question"}</span>
        <span style={{fontSize:10,padding:"2px 8px",borderRadius:3,background:"#E0DED8",color:"#666",fontWeight:500}}>{post.topic}</span>
      </div>
      <h3 style={{...serif,fontSize:17,fontWeight:700,margin:"0 0 6px",color:"#111",lineHeight:1.3,fontStyle:"normal"}}>{post.title}</h3>
      {type==="take" && <p style={{fontSize:13,color:"#555",margin:"0 0 10px",lineHeight:1.6}}>{post.body}</p>}
      {type==="question" && post.context && <p style={{fontSize:13,color:"#666",margin:"0 0 10px",lineHeight:1.5,fontStyle:"italic"}}>{post.context}</p>}
      <div style={{display:"flex",alignItems:"center",gap:10,fontSize:11,color:"#666"}}>
        <span>{type==="take"?`${post.responses} counterarguments`:`${post.answers} answers`}</span>
        {type==="take" && <span>{post.factChecks} fact-checks</span>}
        {post.sourced && <span style={{padding:"2px 7px",borderRadius:3,background:"#C8DDD0",color:GD,fontWeight:700,fontSize:10}}>Sourced</span>}
      </div>
    </div>
  );

  // ========== TAKE DETAIL ==========
  const TakeDetail = () => { const p=viewData; return (
    <div>
      <span style={{fontSize:12,color:"#111",cursor:"pointer",fontWeight:700,display:"inline-block",margin:"16px 0"}} onClick={()=>setView(null)}>← Back to forum</span>
      <div style={{...s.card,cursor:"default",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <Avatar initials={p.initials} size={30} anon={p.author==="Anonymous"} />
          <div><p style={{fontSize:13,fontWeight:700,margin:0}}>{p.author}</p><p style={{fontSize:11,color:"#666",margin:0}}>{p.school} · {p.time} ago</p></div>
          {p.cred && <Cred score={p.cred} />}
          <span style={{marginLeft:"auto"}}><Badge type={p.badge} size="md" /></span>
        </div>
        <h1 style={{...serif,fontSize:22,fontWeight:700,margin:"0 0 12px",lineHeight:1.3,color:"#111",fontStyle:"normal"}}>{p.title}</h1>
        <p style={{fontSize:14,color:"#333",lineHeight:1.7,margin:"0 0 14px"}}>{p.body}</p>
        <p style={{fontSize:14,color:"#333",lineHeight:1.7,margin:"0 0 16px"}}>This is where the full body of the Take would continue with every factual claim annotated inline by the AI.</p>
        <div style={{background:"#F0EFEA",border:"1px solid #D0CEC7",borderRadius:4,padding:14}}>
          <p style={{fontSize:10,color:"#555",margin:"0 0 8px",letterSpacing:2,textTransform:"uppercase",fontWeight:700,...sans}}>Inline fact-check</p>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <Badge type="verified" size="md" />
            <div>
              <p style={{fontSize:13,color:"#333",margin:"0 0 3px"}}>"SGA elections see 40% turnout with plurality winners capturing 28%"</p>
              <p style={{fontSize:12,color:"#666",margin:"0 0 6px"}}>Confirmed by Purdue Exponent, 2025.</p>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:11,color:"#111",cursor:"pointer",fontWeight:600,textDecoration:"underline"}} onClick={()=>openChallenge("SGA elections see 40% turnout with plurality winners capturing 28%","verified",p.id,"take")}>Challenge this</span>
                {challengeCounts[p.id] && <span style={{fontSize:10,color:"#888",...sans}}>({challengeCounts[p.id]} {challengeCounts[p.id]===1?"challenge":"challenges"})</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <button style={{fontSize:11,padding:"7px 16px",borderRadius:4,border:"1px solid #D0CEC7",background:"#fff",color:"#555",cursor:"pointer",...sans,fontWeight:600}} onClick={()=>openSharePost(p,"take")}>Share</button>
      </div>
      <div style={{background:"#1A1A1A",padding:"12px 20px",borderRadius:4,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h2 style={{...hd(17),color:"#fff",margin:0,textDecorationColor:"#fff"}}>Counterarguments ({COUNTER_ARGS.length})</h2>
        <button style={{fontSize:11,padding:"6px 14px",borderRadius:4,border:"1px solid #555",background:"transparent",color:"#fff",cursor:"pointer",...sans,fontWeight:700}} onClick={()=>setCounterOpen(!counterOpen)}>Write counterargument</button>
      </div>
      {counterOpen && (
        <div style={{...s.card,cursor:"default",marginBottom:14}}>
          <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:700}}>What claim are you addressing?</p>
          <input value={counterForm.addressing} onChange={e=>setCounterForm(f=>({...f,addressing:e.target.value}))} placeholder="e.g. The claim that RCV increases participation" style={{...s.inputLight,marginBottom:10}} />
          <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:700}}>Your position</p>
          <input value={counterForm.position} onChange={e=>setCounterForm(f=>({...f,position:e.target.value}))} placeholder="State your counterargument..." style={{...s.inputLight,marginBottom:10}} />
          <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:700}}>Your reasoning</p>
          <textarea rows={4} value={counterForm.reasoning} onChange={e=>setCounterForm(f=>({...f,reasoning:e.target.value}))} placeholder="Explain why — minimum 100 words..." style={s.inputLight} />
          {WordCount({text:counterForm.reasoning,min:100})}
          <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:700}}>Evidence (optional)</p>
          <input value={counterForm.evidence} onChange={e=>setCounterForm(f=>({...f,evidence:e.target.value}))} placeholder="Paste a URL..." style={{...s.inputLight,marginBottom:12}} />
          {(()=>{ const dis = wc(counterForm.reasoning)<100; return <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            <button style={s.btn(false)} onClick={()=>setCounterOpen(false)}>Cancel</button>
            <button style={{...s.btn(true),opacity:dis?.5:1,cursor:dis?"not-allowed":"pointer"}} onClick={dis?undefined:()=>handleCounterSubmit(p.id)} disabled={dis}>Submit counterargument</button>
          </div>; })()}
        </div>
      )}
      {COUNTER_ARGS.map((c,i)=>(
        <div key={i} style={{...s.card,cursor:"default"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <Avatar initials={c.initials} size={22} /><span style={{fontSize:12,fontWeight:700}}>{c.author}</span><Cred score={c.cred} />
            <span style={{fontSize:11,color:"#666"}}>{c.school} · {c.time} ago</span>
            <span style={{marginLeft:"auto"}}><Badge type={c.badge} /></span>
          </div>
          <p style={{fontSize:11,color:"#666",margin:"0 0 4px",fontWeight:600,...sans}}>Addressing: {c.addressing}</p>
          <p style={{fontSize:13,fontWeight:700,color:"#111",margin:"0 0 4px"}}>{c.position}</p>
          <p style={{fontSize:13,color:"#555",margin:"0 0 8px",lineHeight:1.6}}>{c.reasoning}</p>
          {c.sources.map((src,j)=><p key={j} style={{fontSize:12,color:"#444",margin:"0 0 2px",textDecoration:"underline"}}>{src}</p>)}
          <div style={{display:"flex",gap:12,marginTop:8}}>
            <span style={{fontSize:11,color:"#666",cursor:"pointer",fontWeight:600}} onClick={()=>alert("Reply feature coming soon.")}>Reply</span>
            <span style={{fontSize:11,color:"#666",cursor:"pointer",fontWeight:600}} onClick={()=>alert("Sources: " + c.sources.join(", "))}>View fact-check</span>
          </div>
        </div>
      ))}
    </div>
  );};

  // ========== QUESTION DETAIL ==========
  const QDetail = () => { const p=viewData; return (
    <div>
      <span style={{fontSize:12,color:"#111",cursor:"pointer",fontWeight:700,display:"inline-block",margin:"16px 0"}} onClick={()=>setView(null)}>← Back to Q&A</span>
      <div style={{...s.card,cursor:"default",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <Avatar initials={p.initials} anon={p.author==="Anonymous"} />
          <span style={{fontSize:13,fontWeight:700}}>{p.author}</span>{p.cred && <Cred score={p.cred} />}
          <span style={{fontSize:11,color:"#666"}}>{p.school} · {p.time} ago</span>
        </div>
        <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,background:"#B8CBE0",color:BD,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>Question</span>
        <h1 style={{...serif,fontSize:22,fontWeight:700,margin:"8px 0 8px",lineHeight:1.3,color:"#111",fontStyle:"normal"}}>{p.title}</h1>
        {p.context && <p style={{fontSize:14,color:"#666",margin:0,fontStyle:"italic",lineHeight:1.6}}>{p.context}</p>}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <button style={{fontSize:11,padding:"7px 16px",borderRadius:4,border:"1px solid #D0CEC7",background:"#fff",color:"#555",cursor:"pointer",...sans,fontWeight:600}} onClick={()=>openSharePost(p,"question")}>Share</button>
      </div>
      <div style={{background:"#1A1A1A",padding:"12px 20px",borderRadius:4,marginBottom:14}}><h2 style={{...hd(17),color:"#fff",margin:0,textDecorationColor:"#fff"}}>Answers ({ANSWERS.length})</h2></div>
      <div style={{...s.card,cursor:"default",marginBottom:14}}>
        <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:700}}>Your position</p>
        <input value={answerForm.position} onChange={e=>setAnswerForm(f=>({...f,position:e.target.value}))} placeholder="State your stance..." style={{...s.inputLight,marginBottom:10}} />
        <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:700}}>Your reasoning</p>
        <textarea rows={4} value={answerForm.reasoning} onChange={e=>setAnswerForm(f=>({...f,reasoning:e.target.value}))} placeholder="Explain why — minimum 100 words..." style={{...s.inputLight}} />
        {WordCount({text:answerForm.reasoning,min:100})}
        <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:700}}>Evidence (optional)</p>
        <input value={answerForm.evidence} onChange={e=>setAnswerForm(f=>({...f,evidence:e.target.value}))} placeholder="Paste a URL or describe your source..." style={{...s.inputLight,marginBottom:12}} />
        {(()=>{ const dis = wc(answerForm.reasoning)<100; return <div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}><button style={{...s.btn(true),opacity:dis?.5:1,cursor:dis?"not-allowed":"pointer"}} onClick={dis?undefined:()=>handleAnswerSubmit(p.id)} disabled={dis}>Submit answer</button></div>; })()}
      </div>
      {ANSWERS.map((a,i)=>(
        <div key={i} style={{...s.card,cursor:"default"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <Avatar initials={a.initials} size={24} /><span style={{fontSize:12,fontWeight:700}}>{a.author}</span><Cred score={a.cred} />
            <span style={{fontSize:11,color:"#666"}}>{a.school} · {a.time} ago</span>
            <span style={{marginLeft:"auto"}}><Badge type={a.badge} /></span>
          </div>
          <p style={{fontSize:13,fontWeight:700,color:"#111",margin:"0 0 4px"}}>{a.position}</p>
          <p style={{fontSize:13,color:"#555",margin:"0 0 8px",lineHeight:1.55}}>{a.reasoning}</p>
          {a.sources.map((src,j)=><p key={j} style={{fontSize:12,color:"#444",margin:"0 0 2px",textDecoration:"underline"}}>{src}</p>)}
          <div style={{display:"flex",gap:12,marginTop:8}}>
            <span style={{fontSize:11,color:"#666",cursor:"pointer",fontWeight:600}} onClick={()=>alert("Follow-up question feature coming soon.")}>Follow-up question</span>
            <span style={{fontSize:11,color:"#666",cursor:"pointer",fontWeight:600}} onClick={()=>alert("Sources: " + a.sources.join(", "))}>View fact-check</span>
          </div>
        </div>
      ))}
      {/* Inline question prompt */}
      <div style={{...s.card,cursor:"default",marginTop:16}}>
        <p style={{fontSize:13,color:"#555",margin:"0 0 8px",...sans}}>Got a question about <span style={{fontWeight:700,color:"#111"}}>{p.topic}</span>?</p>
        <div style={{display:"flex",gap:8}}>
          <input value={inlineQ} onChange={e=>setInlineQ(e.target.value)} placeholder="Type your question..." style={{...s.inputLight,flex:1}} onKeyDown={e=>{if(e.key==="Enter")handleInlineQuestion(p.topic)}} />
          <button style={{...s.btn(true),padding:"9px 18px",flexShrink:0}} onClick={()=>handleInlineQuestion(p.topic)}>Ask</button>
        </div>
      </div>
    </div>
  );};

  // ========== WRITE MODAL ==========
  const WriteModal = () => (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={e=>{if(e.target===e.currentTarget){setWriteOpen(false);resetWriteForm()}}}>
      <div style={{background:"#FFFFFF",borderRadius:8,maxWidth:560,width:"100%",maxHeight:"85vh",overflow:"auto",padding:"28px 32px",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{...serif,fontSize:20,fontWeight:700,margin:0,color:"#111",fontStyle:"normal"}}>{section==="qa"?"Ask a question":"Write a take"}</h2>
          <span style={{fontSize:18,cursor:"pointer",color:"#888",lineHeight:1}} onClick={()=>{setWriteOpen(false);resetWriteForm()}}>×</span>
        </div>
        {section==="forum" && <div style={{display:"inline-flex",background:"#E8E6E0",borderRadius:4,overflow:"hidden",marginBottom:16}}>
          <button style={s.toggle(writeMode==="freeform")} onClick={()=>setWriteMode("freeform")}>Freeform</button>
          <button style={s.toggle(writeMode==="guided")} onClick={()=>setWriteMode("guided")}>Guided</button>
        </div>}
        <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:600}}>Topic</p>
        <select value={writeForm.topic} onChange={e=>setWriteForm(f=>({...f,topic:e.target.value}))} style={{...s.select,width:"100%",marginBottom:16}}><option value="">Select a topic...</option>{TOPICS.map(t=><option key={t} value={t}>{t}</option>)}</select>
        {section==="qa" ? <>
          <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:600}}>Your question</p>
          <textarea rows={3} value={writeForm.title} onChange={e=>setWriteForm(f=>({...f,title:e.target.value}))} placeholder="What do you want to know?" style={{...s.inputLight,marginBottom:12}} />
          <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:600}}>Context (optional)</p>
          <textarea rows={2} value={writeForm.context} onChange={e=>setWriteForm(f=>({...f,context:e.target.value}))} placeholder="Why are you asking?" style={{...s.inputLight,marginBottom:16}} />
        </> : writeMode==="freeform" ? <>
          <div style={{borderBottom:"2px solid #111",paddingBottom:8,marginBottom:12}}>
            <input value={writeForm.title} onChange={e=>setWriteForm(f=>({...f,title:e.target.value}))} placeholder="Title your take..." style={{width:"100%",border:"none",fontSize:18,...serif,fontWeight:700,background:"transparent",outline:"none",boxSizing:"border-box",color:"#111"}} />
          </div>
          <textarea rows={8} value={writeForm.body} onChange={e=>setWriteForm(f=>({...f,body:e.target.value}))} placeholder="Write your argument — minimum 150 words..." style={{width:"100%",padding:"10px 0",border:"none",fontSize:14,...sans,boxSizing:"border-box",background:"transparent",outline:"none",resize:"vertical",color:"#111"}} />
          {WordCount({text:writeForm.body,min:150})}
        </> : <>
          {[["What's the issue?","issue","Describe the topic..."],["What's your take?","take","State your position..."],["Why?","why","Make your case — minimum 150 words..."]].map(([l,k,ph],i)=>(
            <div key={k} style={{marginBottom:i===2?6:14}}>
              <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:700}}>{l}</p>
              <textarea rows={i===2?4:2} value={writeForm[k]} onChange={e=>setWriteForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={s.inputLight} />
              {i===2 && WordCount({text:writeForm.why,min:150})}
            </div>
          ))}
        </>}
        <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:600}}>Sources (optional)</p>
        <input value={writeForm.source} onChange={e=>setWriteForm(f=>({...f,source:e.target.value}))} placeholder="Paste a URL..." style={{...s.inputLight,marginBottom:16}} />
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <label style={{fontSize:12,color:"#555",display:"flex",alignItems:"center",gap:6,...sans}}><input type="checkbox" checked={writeForm.anonymous} onChange={e=>setWriteForm(f=>({...f,anonymous:e.target.checked}))} /> Post anonymously</label>
          {(()=>{ const isQ = section==="qa"; const body = writeMode==="guided"?writeForm.why:writeForm.body; const dis = !isQ && wc(body)<150; return <button style={{...s.btn(true),padding:"10px 24px",opacity:dis?.5:1,cursor:dis?"not-allowed":"pointer"}} onClick={dis?undefined:handleWriteSubmit} disabled={dis}>Submit for review →</button>; })()}
        </div>
      </div>
    </div>
  );

  // ========== DEBATES ==========
  const DebatesPage = () => (
    <div style={{padding:"16px 0"}}>
      <div style={{padding:"40px 24px",background:"#FFFFFF",border:"1px solid #D0CEC7",borderRadius:6}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:10,background:YD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",flexShrink:0}}>3</div>
          <div>
            <h2 style={{...serif,fontSize:22,fontWeight:700,margin:0,color:"#111",fontStyle:"normal"}}>Live Debates</h2>
            <p style={{fontSize:13,color:"#666",margin:"2px 0 0",...sans}}>Real-time voice discussions with AI fact-checking.</p>
          </div>
        </div>
        <p style={{fontSize:14,color:"#555",margin:"0 0 16px",lineHeight:1.6,...sans,maxWidth:500}}>When a speaker makes a factual claim, the AI evaluates it and displays the verdict to everyone in real time.</p>
        <p style={{fontSize:12,color:"#888",...sans,fontWeight:600}}>Coming in Phase 3</p>
      </div>
    </div>
  );

  // ========== PROFILE ==========
  const ProfilePage = () => (
    <div style={{padding:"24px 0"}}>
      <div style={{background:"#1A1A1A",margin:"0 0 20px",padding:"28px 24px",borderRadius:6,border:"2px solid #333"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"#555",border:"2px solid #888",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#fff",fontWeight:700,...sans,flexShrink:0}}>{pInitials}</div>
          <div style={{flex:1}}>
            <h2 style={{...hd(22),color:"#fff",margin:"0 0 2px",textDecorationColor:"#fff"}}>{profile?.display_name || "Your Name"}</h2>
            <p style={{fontSize:12,color:"rgba(255,255,255,.5)",margin:0,...sans}}>{[profile?.school, profile?.degree_program, profile?.major, profile?.grad_year ? `Class of ${profile.grad_year}` : null].filter(Boolean).join(" \u00b7 ") || "Complete your profile"}</p>
            {profile?.bio && <p style={{fontSize:11,color:"rgba(255,255,255,.5)",margin:"3px 0 0",...sans}}>{profile.bio}</p>}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
            <div style={{textAlign:"center"}}>
              <p style={{...serif,fontSize:32,fontWeight:700,color:"#fff",margin:0,fontStyle:"normal"}}>{profile?.credibility_score ?? 0}%</p>
              <p style={{fontSize:9,color:"rgba(255,255,255,.5)",margin:0,...sans,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Credibility</p>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button style={{fontSize:11,padding:"5px 14px",borderRadius:4,border:"1px solid #555",background:"transparent",color:"rgba(255,255,255,.6)",cursor:"pointer",...sans,fontWeight:600}} onClick={openShareCredibility}>Share credibility</button>
              <button style={{fontSize:11,padding:"5px 14px",borderRadius:4,border:"1px solid #555",background:"transparent",color:"rgba(255,255,255,.6)",cursor:"pointer",...sans,fontWeight:600}} onClick={openEditProfile}>Edit profile</button>
              <button style={{fontSize:11,padding:"5px 14px",borderRadius:4,border:"1px solid #444",background:"transparent",color:"rgba(255,255,255,.5)",cursor:"pointer",...sans,fontWeight:600}} onClick={handleLogout}>Sign out</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:24}}>
        {[["Takes",String(userStats.takes)],["Answers",String(userStats.answers)],["Questions",String(userStats.questions)],["Accuracy",`${profile?.credibility_score ?? 0}%`]].map(([l,v])=>(
          <div key={l} style={{background:"#FFFFFF",border:"1px solid #D0CEC7",borderRadius:4,padding:12,textAlign:"center"}}>
            <p style={{...serif,fontSize:20,fontWeight:700,margin:"0 0 2px",color:"#111",fontStyle:"normal"}}>{v}</p>
            <p style={{fontSize:9,color:"#555",margin:0,...sans,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{l}</p>
          </div>
        ))}
      </div>
      <p style={s.sl}>Your Takes</p>
      {userTakes.length > 0 ? userTakes.map(t=>(
        <div key={t.id} style={{...s.card,cursor:"default"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,background:"#C8C6BF",color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>Take</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:3,background:"#E0DED8",color:"#666",fontWeight:500}}>{t.topic}</span>
            {t.sourced && <span style={{padding:"2px 7px",borderRadius:3,background:"#C8DDD0",color:GD,fontWeight:700,fontSize:10}}>Sourced</span>}
            {t.is_anonymous && <span style={{fontSize:10,color:"#999"}}>Anonymous</span>}
          </div>
          <h3 style={{...serif,fontSize:17,fontWeight:700,margin:"0 0 4px",color:"#111",lineHeight:1.3,fontStyle:"normal"}}>{t.title}</h3>
          <p style={{fontSize:13,color:"#555",margin:0,lineHeight:1.6}}>{t.body.slice(0,150)}{t.body.length>150?"...":""}</p>
        </div>
      )) : <p style={{fontSize:13,color:"#999",margin:"0 0 10px",...sans}}>No takes yet. Write your first take in the Forum.</p>}
      <p style={{...s.sl,marginTop:20}}>Your Questions</p>
      {userQuestions.length > 0 ? userQuestions.map(q=>(
        <div key={q.id} style={{...s.card,cursor:"default"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,background:"#B8CBE0",color:BD,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>Question</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:3,background:"#E0DED8",color:"#666",fontWeight:500}}>{q.topic}</span>
            {q.is_anonymous && <span style={{fontSize:10,color:"#999"}}>Anonymous</span>}
          </div>
          <h3 style={{...serif,fontSize:17,fontWeight:700,margin:"0 0 4px",color:"#111",lineHeight:1.3,fontStyle:"normal"}}>{q.title}</h3>
          {q.context && <p style={{fontSize:13,color:"#666",margin:0,lineHeight:1.5,fontStyle:"italic"}}>{q.context}</p>}
        </div>
      )) : <p style={{fontSize:13,color:"#999",margin:"0 0 10px",...sans}}>No questions yet. Ask your first question in Q&A.</p>}
    </div>
  );

  // ========== FEEDS ==========
  const QAFeed = () => { const f=topic==="All"?QUESTIONS:QUESTIONS.filter(p=>p.topic===topic); return <div style={{padding:"16px 0"}}>
    {VerifyBanner()}
    {f.map((p,i)=><div key={p.id}><TakeCard post={p} type="question" />{i===2 && <ContextualPrompt topicHint={f[2]?.topic||"politics"} />}</div>)}
    {f.length===0&&<p style={{textAlign:"center",color:"#999",padding:40,...sans}}>No questions yet.</p>}</div>; };

  const ForumFeed = () => { const f=topic==="All"?TAKES:TAKES.filter(p=>p.topic===topic); return <div style={{padding:"16px 0"}}>
    {VerifyBanner()}
    {f.map((p,i)=><div key={p.id}><TakeCard post={p} type="take" />{i===1 && <ContextualPrompt topicHint={f[1]?.topic||"politics"} />}</div>)}
    {f.length===0&&<p style={{textAlign:"center",color:"#999",padding:40,...sans}}>No takes yet.</p>}</div>; };

  // ========== NAV ==========
  const Nav = () => (
    <nav style={s.nav}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:52,padding:"0 20px",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span className="hamburger" style={{display:"none",fontSize:20,color:"#fff",cursor:"pointer",lineHeight:1}} onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</span>
        <div style={s.logo} onClick={()=>goSection("forum")}>The Student Opinion</div>
      </div>
      <div style={s.navR}>
        <span style={s.nt(section==="forum")} onClick={()=>goSection("forum")}>Forum</span>
        <span style={s.nt(section==="qa")} onClick={()=>goSection("qa")}>Q&A</span>
        <span style={s.nt(section==="debates")} onClick={()=>goSection("debates")}>Debates</span>
        {/* Notification bell */}
        {session && <div style={{position:"relative",marginLeft:4}}>
          <span style={{fontSize:18,cursor:"pointer",color:"rgba(255,255,255,.6)",lineHeight:1}} onClick={()=>{setNotifOpen(!notifOpen);if(!notifOpen)markAllRead()}}>🔔</span>
          {unreadCount > 0 && <span style={{position:"absolute",top:-4,right:-6,background:"#E33",color:"#fff",fontSize:9,fontWeight:700,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",...sans}}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          {notifOpen && <div style={{position:"absolute",top:32,right:0,width:320,maxHeight:400,overflowY:"auto",background:"#fff",border:"1px solid #D0CEC7",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,.12)",zIndex:200,padding:0}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #E8E6E0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{fontSize:13,fontWeight:700,margin:0,color:"#111",...sans}}>Notifications</p>
              {notifications.length>0 && <span style={{fontSize:11,color:"#888",cursor:"pointer",...sans}} onClick={markAllRead}>Mark all read</span>}
            </div>
            {notifications.length === 0 ? (
              <p style={{padding:"24px 16px",fontSize:13,color:"#888",textAlign:"center",margin:0,...sans}}>No notifications yet</p>
            ) : notifications.map(n=>(
              <div key={n.id} onClick={()=>handleNotifClick(n)} style={{padding:"10px 16px",borderBottom:"1px solid #F0EEE8",cursor:"pointer",background:n.is_read?"transparent":"rgba(30,90,59,.04)",transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background=n.is_read?"#F8F8F6":"rgba(30,90,59,.08)"} onMouseLeave={e=>e.currentTarget.style.background=n.is_read?"transparent":"rgba(30,90,59,.04)"}>
                <p style={{fontSize:12,color:"#111",margin:"0 0 2px",fontWeight:n.is_read?400:600,...sans}}>{n.message}</p>
                <p style={{fontSize:10,color:"#888",margin:0,...sans}}>{n.created_at ? new Date(n.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : ""}</p>
              </div>
            ))}
          </div>}
        </div>}
        <div style={s.av} onClick={()=>goSection("profile")}>{pInitials}</div>
      </div>
    </div></nav>
  );

  // ========== ROUTER ==========
  if (authLoading) return <div style={{...s.page,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#888",fontSize:14}}>Loading...</p></div>;
  if (page==="landing") return LandingPage();
  if (page==="auth") return AuthPage();

  const isFeed = (section==="forum"||section==="qa") && !view;

  return (
    <div style={s.page}>
      <Nav />
      <div style={{display:"flex",minHeight:"calc(100vh - 55px)"}}>
        {/* Desktop sidebar — always visible */}
        <div className="sidebar-desktop">{Sidebar()}</div>
        {/* Mobile sidebar overlay */}
        {sidebarOpen && <>
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",zIndex:80}} onClick={()=>setSidebarOpen(false)} />
          <div style={{position:"fixed",top:52,left:0,bottom:0,zIndex:90,width:280,background:"#F0EEE8",borderRight:"1px solid #D0CEC7",overflowY:"auto",padding:"20px 20px 28px",boxSizing:"border-box",display:"flex",flexDirection:"column"}}>
            <div style={{marginBottom:20}}>{["general","campus"].map(f=><button key={f} onClick={()=>{setFeed(f);setSidebarOpen(false)}} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",marginBottom:4,borderRadius:4,border:"none",background:feed===f?"#111":"transparent",color:feed===f?"#fff":"#555",cursor:"pointer",...sans,fontSize:12,fontWeight:feed===f?700:500}}>{f==="general"?"General":"My Campus"}</button>)}</div>
            <p style={sbl}>Topics</p>
            <div style={{marginBottom:20}}>{["All",...TOPICS].map(t=><div key={t} onClick={()=>{setTopic(t==="All"?"All":t);setSidebarOpen(false)}} style={{padding:"6px 12px",marginBottom:2,borderRadius:4,cursor:"pointer",fontSize:12,color:topic===(t==="All"?"All":t)?"#111":"#555",fontWeight:topic===(t==="All"?"All":t)?700:400,background:topic===(t==="All"?"All":t)?"rgba(0,0,0,.06)":"transparent",...sans}}>{t}</div>)}</div>
            <div style={{marginTop:"auto"}}><button style={{...s.btn(true),width:"100%",padding:"10px 0",fontSize:12}} onClick={()=>{tryWrite();setSidebarOpen(false)}}>{section==="qa"?"Ask a question":"Write a take"}</button></div>
          </div>
        </>}
        {/* Main content — fills all remaining space */}
        <div style={{flex:1,padding:isFeed?"0 40px 80px 28px":"16px 40px 80px 28px",boxSizing:"border-box",minWidth:0}}>
          {section==="forum"&&!view&&ForumFeed()}
          {section==="forum"&&view==="take-detail"&&TakeDetail()}
          {section==="qa"&&!view&&QAFeed()}
          {section==="qa"&&view==="q-detail"&&QDetail()}
          {section==="debates"&&DebatesPage()}
          {section==="profile"&&ProfilePage()}
        </div>
      </div>
      {/* Mobile FAB */}
      {isFeed && <button className="fab" style={{display:"none",position:"fixed",bottom:24,right:24,width:56,height:56,borderRadius:"50%",background:"#111",color:"#fff",border:"none",cursor:"pointer",fontSize:24,boxShadow:"0 4px 12px rgba(0,0,0,.2)",zIndex:60,...sans,fontWeight:700}} onClick={tryWrite}>+</button>}
      {writeOpen&&WriteModal()}
      {editOpen&&EditProfileModal()}
      {shareOpen && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{if(e.target===e.currentTarget)setShareOpen(false)}}>
          <div style={{background:"#F0EEE8",borderRadius:8,maxWidth:520,width:"100%",padding:"24px 28px",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{...serif,fontSize:18,fontWeight:700,margin:0,color:"#111",fontStyle:"normal"}}>Share card</h2>
              <span style={{fontSize:18,cursor:"pointer",color:"#888"}} onClick={()=>setShareOpen(false)}>×</span>
            </div>
            {/* The card to capture */}
            <div ref={shareRef} style={{background:"#fff",borderRadius:8,padding:"40px 36px",border:"1px solid #D0CEC7",marginBottom:16}}>
              {shareType==="post" && shareData && <>
                <p style={{...serif,fontSize:14,fontWeight:700,textDecoration:"underline",textDecorationThickness:1.5,textUnderlineOffset:4,margin:"0 0 20px",color:"#111",fontStyle:"normal"}}>The Student Opinion</p>
                <h1 style={{...serif,fontSize:24,fontWeight:700,margin:"0 0 14px",color:"#111",lineHeight:1.3,fontStyle:"normal"}}>{shareData.title}</h1>
                {shareData.badge && <div style={{marginBottom:14}}><Badge type={shareData.badge} size="md" /></div>}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#111",...sans}}>{shareData.author}</span>
                  {shareData.cred && <span style={{fontSize:12,color:"#555",fontWeight:600,...sans}}>{shareData.cred}%</span>}
                  <span style={{fontSize:12,color:"#666",...sans}}>{shareData.school}</span>
                </div>
                {shareData.body && <p style={{fontSize:14,color:"#333",lineHeight:1.7,margin:"0 0 20px",...sans}}>{shareData.body.slice(0,200)}{shareData.body.length>200?"...":""}</p>}
                <p style={{fontSize:11,color:"#888",margin:0,...sans}}>thestudentopinion.com</p>
              </>}
              {shareType==="credibility" && profile && <>
                <p style={{...serif,fontSize:14,fontWeight:700,textDecoration:"underline",textDecorationThickness:1.5,textUnderlineOffset:4,margin:"0 0 24px",color:"#111",fontStyle:"normal"}}>The Student Opinion</p>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <p style={{...serif,fontSize:56,fontWeight:700,color:"#111",margin:"0 0 4px",fontStyle:"normal"}}>{profile.credibility_score??0}%</p>
                  <p style={{fontSize:11,color:"#555",margin:0,...sans,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Credibility score</p>
                </div>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <p style={{fontSize:18,fontWeight:700,color:"#111",margin:"0 0 4px",...sans}}>{profile.display_name}</p>
                  <p style={{fontSize:13,color:"#555",margin:0,...sans}}>{[profile.school, profile.degree_program, profile.major].filter(Boolean).join(" · ")}</p>
                </div>
                <div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:20}}>
                  <div style={{textAlign:"center"}}><p style={{fontSize:20,fontWeight:700,color:"#111",margin:0,...sans}}>{userStats.takes}</p><p style={{fontSize:10,color:"#666",margin:0,...sans}}>Takes</p></div>
                  <div style={{textAlign:"center"}}><p style={{fontSize:20,fontWeight:700,color:"#111",margin:0,...sans}}>{userStats.answers}</p><p style={{fontSize:10,color:"#666",margin:0,...sans}}>Answers</p></div>
                  <div style={{textAlign:"center"}}><p style={{fontSize:20,fontWeight:700,color:"#111",margin:0,...sans}}>{userStats.questions}</p><p style={{fontSize:10,color:"#666",margin:0,...sans}}>Questions</p></div>
                </div>
                <p style={{fontSize:11,color:"#888",margin:0,textAlign:"center",...sans}}>thestudentopinion.com</p>
              </>}
            </div>
            {/* Action buttons */}
            <div style={{display:"flex",gap:10}}>
              <button style={{...s.btn(true),flex:1,padding:"10px 0"}} onClick={handleCopyCard}>Copy to clipboard</button>
              <button style={{...s.btn(false),flex:1,padding:"10px 0"}} onClick={handleDownloadCard}>Download PNG</button>
            </div>
          </div>
        </div>
      )}
      {challengeOpen && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{if(e.target===e.currentTarget)setChallengeOpen(false)}}>
          <div style={{background:"#fff",borderRadius:8,maxWidth:480,width:"100%",padding:"28px 32px",position:"relative"}}>
            <h2 style={{...serif,fontSize:18,fontWeight:700,margin:"0 0 16px",color:"#111",fontStyle:"normal"}}>Challenge fact-check</h2>
            <div style={{background:"#F0EFEA",border:"1px solid #D0CEC7",borderRadius:4,padding:12,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <Badge type={challengeForm.badge} size="md" />
                <span style={{fontSize:11,color:"#666",...sans}}>Current evaluation</span>
              </div>
              <p style={{fontSize:13,color:"#333",margin:0,...sans,fontStyle:"italic"}}>"{challengeForm.claim}"</p>
            </div>
            <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:600}}>Your source URL (required)</p>
            <input value={challengeForm.source} onChange={e=>setChallengeForm(f=>({...f,source:e.target.value}))} placeholder="https://..." style={{...s.inputLight,marginBottom:12}} />
            <p style={{fontSize:12,color:"#333",margin:"0 0 5px",...sans,fontWeight:600}}>Why is this wrong? (optional)</p>
            <textarea rows={3} value={challengeForm.reason} onChange={e=>setChallengeForm(f=>({...f,reason:e.target.value}))} placeholder="Brief explanation..." style={{...s.inputLight,marginBottom:16}} />
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <button style={s.btn(false)} onClick={()=>setChallengeOpen(false)}>Cancel</button>
              <button style={{...s.btn(true),opacity:challengeForm.source.trim()?"1":".5",cursor:challengeForm.source.trim()?"pointer":"not-allowed"}} onClick={challengeForm.source.trim()?handleChallengeSubmit:undefined} disabled={!challengeForm.source.trim()}>Submit challenge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
