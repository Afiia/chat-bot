import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Paperclip, ArrowUp, Sun, Moon, Menu, X, FileText, FileCode2,
  Image as ImageIcon, Trash2, User, LogOut, Sparkles, MessageSquare, UploadCloud,
} from "lucide-react";

/* ───────────────────────── Theme tokens (CSS variables, no Tailwind config needed) ───────────────────────── */
const THEMES = {
  dark: {
    "--bg": "#0d1017", "--panel": "rgba(22,27,38,0.72)", "--card": "rgba(255,255,255,0.045)",
    "--line": "rgba(255,255,255,0.08)", "--text": "#e9ecf3", "--muted": "#8a93a6",
    "--accent": "#f2b45a", "--accent-ink": "#1b1305", "--user": "#1c2333",
    "--glow": "rgba(242,180,90,0.16)",
  },
  light: {
    "--bg": "#f6f4ef", "--panel": "rgba(255,255,255,0.72)", "--card": "rgba(20,24,34,0.04)",
    "--line": "rgba(20,24,34,0.09)", "--text": "#171a23", "--muted": "#6b7285",
    "--accent": "#c9821f", "--accent-ink": "#fff8ea", "--user": "#ebe7dd",
    "--glow": "rgba(201,130,31,0.14)",
  },
};

/* ───────────────────────── Mock AI engine ───────────────────────── */
const TECH = /\b(algorithm|complexity|implement|architecture|analy[sz]e|explain|theory|database|sql|api|function|recursion|neural|machine learning|regression|framework|compiler|protocol|latency|optimi[sz]e|research|hypothesis|derive|proof|equation|react|python|javascript|typescript|kubernetes|docker|operating system|encryption|thesis|methodology|statistical|paradigm|asynchronous|polymorphism|normalization)\b/i;
const CASUAL = /\b(lol|haha|hey|hi|yo|sup|bro|dude|wanna|gonna|pls|plz|omg|fun|joke|vibe|cool|awesome|bored|tbh|btw|thanks|thx|ok|okay|nice|help me out)\b|\p{Extended_Pictographic}|!{2,}|\?{2,}/iu;

function detectTone(text) {
  let tech = 0, casual = 0;
  if (TECH.test(text)) tech += 2;
  if (/\b(why does|how does|what is the difference|compare|evaluate|discuss|describe)\b/i.test(text)) tech += 1;
  if (text.split(/\s+/).length > 22) tech += 1;
  if (CASUAL.test(text)) casual += 2;
  if (text === text.toLowerCase() && text.length < 40) casual += 1;
  if (/[!]/.test(text)) casual += 1;
  return tech > casual ? "formal" : casual > tech ? "casual" : text.length > 60 ? "formal" : "casual";
}

function extractFacts(messages) {
  const facts = [];
  messages.filter((m) => m.role === "user").forEach((m) => {
    const t = m.text;
    let x;
    if ((x = t.match(/my name is ([A-Za-z]+)/i))) facts.push({ k: "name", v: x[1] });
    if ((x = t.match(/\bi(?:'m| am) (?:a |an )?([\w\s]{3,30}?)(?:[.,!?]|$)/i))) facts.push({ k: "identity", v: x[1].trim() });
    if ((x = t.match(/\bi (?:really )?(?:like|love|enjoy|prefer) ([^.!?]+)/i))) facts.push({ k: "likes", v: x[1].trim() });
    if ((x = t.match(/\bmy ([a-z ]{2,20}) is ([^.!?]+)/i)) && x[1] !== "name") facts.push({ k: x[1].trim(), v: x[2].trim() });
    if ((x = t.match(/\b(?:working on|building|studying) ([^.!?]+)/i))) facts.push({ k: "project", v: x[1].trim() });
  });
  return facts;
}

const TOPICS = [
  [/react|component|hook|jsx/i, {
    c: "React in a nutshell: you break your UI into little reusable pieces (components) and React re-renders them when your data (state) changes. Hooks like `useState` and `useEffect` are how those pieces remember stuff and react to things. Want a tiny example?",
    f: "**React** is a declarative UI library built on a component model and unidirectional data flow.\n• **State** (`useState`) holds data that triggers re-rendering.\n• **Effects** (`useEffect`) synchronise components with external systems.\n• **Reconciliation** diffs a virtual tree to minimise DOM mutations.\nI can expand on rendering performance or state-management patterns if useful.",
  }],
  [/recursion|recursive/i, {
    c: "Recursion is just a function calling itself on a smaller version of the problem until it hits a base case. Think Russian nesting dolls: open one, find a smaller one, stop when there's nothing left inside.",
    f: "**Recursion** solves a problem by reducing it to smaller instances of itself.\n• A **base case** terminates the process.\n• A **recursive case** shrinks the input toward that base.\nComplexity depends on branching: naive Fibonacci is O(2ⁿ), while memoisation reduces it to O(n).",
  }],
  [/database|sql|normali[sz]ation|index/i, {
    c: "Databases are basically super-organised spreadsheets that can answer questions fast. SQL is how you ask them stuff, and indexes are like the index at the back of a book — they save you from flipping through every page.",
    f: "A **relational database** stores data in tables governed by a schema.\n• **Normalisation** (1NF–3NF) removes redundancy and update anomalies.\n• **Indexes** (typically B-trees) trade write cost and storage for O(log n) reads.\n• **ACID** transactions guarantee consistency under concurrency.",
  }],
  [/machine learning|neural|ml\b|ai\b|regression|model/i, {
    c: "Machine learning is teaching a computer by showing it lots of examples instead of writing rules by hand. It spots patterns, then guesses on new stuff. Neural nets are just layers of tiny math functions that learn which patterns matter.",
    f: "**Machine learning** fits a parametric function to data by minimising a loss.\n• **Supervised**: labelled examples (regression, classification).\n• **Unsupervised**: structure discovery (clustering).\n• **Generalisation** is evaluated on held-out data to detect overfitting.\nGradient descent with backpropagation trains neural networks.",
  }],
  [/operating system|process|thread|deadlock/i, {
    c: "An OS is the manager that lets all your apps share the computer without fighting. Processes are running programs, threads are the little workers inside them, and a deadlock is when two of them wait on each other forever. Awkward.",
    f: "An **operating system** abstracts hardware and arbitrates resources.\n• **Processes** have isolated address spaces; **threads** share one.\n• **Deadlock** requires mutual exclusion, hold-and-wait, no pre-emption, and circular wait.\n• Schedulers balance throughput, latency and fairness.",
  }],
  [/big o|complexity|sort|algorithm/i, {
    c: "Big-O is just a way to say how badly your code slows down as the input grows. O(n) = grows in line with the data, O(n²) = ouch, O(log n) = you're a wizard. Sorting is the classic place to see this in action.",
    f: "**Asymptotic analysis** characterises growth rate independent of hardware.\n• Comparison sorts have an Ω(n log n) lower bound.\n• Merge sort: O(n log n) worst case, O(n) space.\n• Quick sort: O(n log n) average, O(n²) worst case.\nThe correct choice depends on stability, memory and input distribution.",
  }],
  [/python/i, {
    c: "Python's the friendly one: readable, forgiving, and it can do pretty much anything, from scripts to data science to web backends. Indentation is the syntax, so tidy code is basically mandatory. Got something specific you're writing?",
    f: "**Python** is a dynamically typed, interpreted language that emphasises readability.\n• Rich standard library and ecosystem (NumPy, pandas, Django).\n• Indentation defines block structure.\n• The GIL limits CPU-bound threading; multiprocessing or native extensions are the usual remedy.",
  }],
  [/javascript|\bjs\b|typescript|node/i, {
    c: "JavaScript is the language of the web: it runs in every browser, and with Node it runs on servers too. It's quirky (hello, `==` vs `===`) but super flexible. TypeScript just adds types on top so the quirks bite less.",
    f: "**JavaScript** is a single-threaded, event-driven language with first-class functions.\n• The **event loop** schedules callbacks, promises and microtasks.\n• **Closures** capture lexical scope.\n• **TypeScript** adds static typing, catching a class of errors at compile time.",
  }],
  [/html|css|tailwind|frontend|front-end/i, {
    c: "Frontend is HTML for structure, CSS for looks, and JavaScript for behaviour. Tailwind just lets you do the CSS part with small utility classes right in your markup, which is quick once it clicks.",
    f: "**Frontend development** composes three layers: HTML (semantics), CSS (presentation) and JavaScript (behaviour).\n• Utility-first CSS such as Tailwind trades stylesheet abstraction for co-located styling.\n• Accessibility and responsiveness should be treated as baseline requirements.",
  }],
  [/git\b|github|version control/i, {
    c: "Git is basically a time machine for your code. You save snapshots (commits), try risky stuff on branches, and merge it back when it works. GitHub is just where you park all of that online.",
    f: "**Git** is a distributed version control system that stores history as a directed acyclic graph of commits.\n• **Branches** are lightweight pointers.\n• **Merge** and **rebase** integrate divergent histories.\n• Remotes such as GitHub enable collaboration and review.",
  }],
  [/cyber|security|encrypt|hash|password/i, {
    c: "Security is mostly about not trusting anything blindly. Encryption scrambles data so only the right key can read it, hashing turns passwords into one-way fingerprints, and the golden rule is: never store passwords in plain text!",
    f: "**Information security** is organised around confidentiality, integrity and availability.\n• **Symmetric** encryption (AES) is fast; **asymmetric** (RSA, ECC) enables key exchange and signatures.\n• Passwords should be stored using salted, adaptive hashes such as bcrypt or Argon2.",
  }],
  [/network|http|tcp|dns|internet|cloud|aws/i, {
    c: "When you open a website, your browser looks up the address with DNS, opens a connection (TCP), asks for the page over HTTP, and the server sends it back. Cloud just means that server is someone else's computer you can rent by the minute.",
    f: "A web request proceeds through **DNS resolution**, a **TCP** handshake (plus TLS), then an **HTTP** exchange.\n• Latency is dominated by round trips.\n• **Cloud** platforms provide elastic compute and storage via virtualisation and managed services.",
  }],
  [/exam|study|deadline|stress|anxious|overwhelm|procrastinat/i, {
    c: "That sounds like a lot, and it's okay to feel it. Try this: pick the one smallest task you can finish in 25 minutes, do just that, then take a 5-minute break. Momentum beats motivation. Want help breaking your list down?",
    f: "Workload pressure is best managed through decomposition and scheduling.\n• List tasks and estimate effort.\n• Prioritise by deadline and impact.\n• Use time-boxed sessions (e.g. 25/5) with active recall rather than re-reading.\nI can help draft a study schedule if you share your deadlines.",
  }],
];

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
  "I'd tell you a UDP joke, but you might not get it.",
  "There are 10 kinds of people: those who understand binary and those who don't.",
];

function analyzeAttachment(a) {
  if (a.kind === "image")
    return `**${a.name}** — ${a.dims || "image"}, ${fmtSize(a.size)}. In this demo I read the metadata and layout only; a production build would route it to a vision model for objects, text and colour analysis.`;
  if (a.kind === "pdf")
    return `**${a.name}** — PDF, ${fmtSize(a.size)}. The demo parser registers the document and its size; full text extraction would be handled by a server-side PDF pipeline.`;
  const lines = (a.content || "").split("\n").length;
  const words = (a.content || "").split(/\s+/).filter(Boolean).length;
  if (a.kind === "code") {
    const fns = ((a.content || "").match(/function\s+\w+|=>\s*[{(]|def\s+\w+|class\s+\w+/g) || []).length;
    const comments = ((a.content || "").match(/^\s*(\/\/|#|\/\*)/gm) || []).length;
    return `**${a.name}** — ${lines} lines, ~${fns} functions/classes, ${comments} comment lines. ${comments / Math.max(lines, 1) < 0.05 ? "Comment density is low; documenting intent would aid maintainability." : "Documentation coverage looks reasonable."}`;
  }
  const first = (a.content || "").trim().split("\n")[0].slice(0, 90);
  return `**${a.name}** — ${lines} lines, ${words} words. Opens with: “${first || "(empty)"}”.`;
}

const STOP = new Set("the a an and or but if then so of to in on at for with about is are was were be been am do does did can could would should will my your me you i we it its this that these those what how why when where which who whom tell explain define describe please just really very some any more much many like want need know think give make get let lets there their them than into from out over".split(" "));
const keyword = (t) => (t.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []).filter((w) => !STOP.has(w)).sort((a, b) => b.length - a.length)[0];
const pick = (arr, n) => arr[Math.abs(n) % arr.length];
const subjectOf = (t) => { const m = t.trim().match(/(?:what(?:'s| is| are| does)|explain|define|describe|tell me about|how (?:does|do|to)|why (?:does|is|do|are)|difference between)\s+(?:the |a |an )?(.+?)[?.!]*$/i); return m ? m[1].slice(0, 60) : null; };
function tryMath(t) {
  const e = t.toLowerCase().replace(/what(?:'s| is)|calculate|compute|solve|=|\?/g, "").replace(/\bx\b/g, "*").replace(/\^/g, "**").trim();
  if (!/^[\d\s+\-*/().%]+$/.test(e) || !/\d\s*[-+*/%]\s*\(?\d/.test(e)) return null;
  try { const v = Function(`"use strict";return (${e})`)(); return Number.isFinite(v) ? +v.toFixed(8) : null; } catch { return null; }
}

function generateReply(text, attachments, history) {
  const tone = detectTone(text);
  const T = (c, f) => (tone === "casual" ? c : f);
  const past = history.slice(0, -1);
  const facts = extractFacts(history);
  const firstUser = past.find((m) => m.role === "user");
  let body;

  if (/remember|earlier|recap|summar|what did i|what do i|who am i|what('s| is) my|do you know my|i told you|go back/i.test(text)) {
    if (!facts.length && !firstUser) {
      body = T("We're just getting started, so there's nothing to look back on yet! Tell me a bit about yourself?", "There is no prior context in this session yet. Provide some background and I will retain it.");
    } else {
      const list = facts.map((f) => `• ${f.k}: **${f.v}**`).join("\n");
      body = T(
        `Yep, I've got you! Here's what I picked up:\n${list || "• (no personal details yet)"}\n${firstUser ? `\nAnd we kicked things off with: “${firstUser.text.slice(0, 80)}”.` : ""}`,
        `Recalled context from this conversation:\n${list || "• No personal attributes recorded."}\n${firstUser ? `\nThe initial query was: “${firstUser.text.slice(0, 80)}”. ${past.length} prior messages are in memory.` : ""}`
      );
    }
  } else if (!/\?/.test(text) && extractFacts([history[history.length - 1]]).length) {
    const f = extractFacts([history[history.length - 1]]).pop();
    const what = f.k === "name" ? `your name is ${f.v}` : f.k === "likes" ? `you like ${f.v}` : f.k === "identity" ? `you're ${f.v}` : `your ${f.k} is ${f.v}`;
    body = T(`Nice, noted! I'll remember that ${what}. 🧠 Ask me later and I'll bring it back up.`, `Noted. I have recorded that ${what}, and will retain it for the remainder of this conversation.`);
  } else if (attachments.length) {
    const report = attachments.map(analyzeAttachment).join("\n");
    body = T(`Got your ${attachments.length > 1 ? "files" : "file"}! Here's my quick take:\n${report}\nWhat should I do with ${attachments.length > 1 ? "them" : "it"}?`,
      `Attachment analysis complete (${attachments.length}):\n${report}\nSpecify an objective — summarisation, review, or extraction — and I will proceed.`);
  } else if (/joke|funny|make me laugh/i.test(text)) {
    body = JOKES[history.length % JOKES.length];
  } else if (/^(hi|hello|hey|yo|sup|good (morning|evening))\b/i.test(text.trim())) {
    const nm = facts.find((f) => f.k === "name");
    body = T(`Hey${nm ? " " + nm.v : ""}! 👋 Good to see you. What are we getting into today?`, `Hello${nm ? ", " + nm.v : ""}. How may I assist you?`);
  } else if (tryMath(text) !== null) {
    const r = tryMath(text);
    body = T(`That's **${r}**. Math done, easy! 🎯`, `The result is **${r}**.`);
  } else if (/how are you|how('s| is) it going|what'?s up/i.test(text)) {
    body = T("Doing great, thanks for asking! Running at full brightness ✨ What's on your mind?", "I am functioning well, thank you. What would you like to work on?");
  } else if (/who are you|what are you|what can you do|your name|what do you do/i.test(text)) {
    body = T("I'm Lumina, your AI study buddy! I can chat, explain tech topics, look through files and images you drop in, and remember what we talk about. I also match my tone to yours.", "I am **Lumina**, an AI assistant. Capabilities: topic explanations, attachment analysis (text, code, images, PDF), multi-turn memory, and tone adaptation. This is a locally simulated demo build.");
  } else if (/thank|thx/i.test(text)) {
    body = T("Anytime! That's what I'm here for 😊", "You're welcome. Let me know if you need further assistance.");
  } else {
    const hit = TOPICS.find(([re]) => re.test(text));
    if (hit) body = tone === "casual" ? hit[1].c : hit[1].f;
    else {
      const n = history.length;
      const subj = subjectOf(text);
      const kw = keyword(text);
      const like = facts.find((f) => f.k === "likes");
      const S = subj || kw || "that";
      const casual = [
        `Good question! For **${S}**, I'd start with the core idea, then the moving parts, then a real-world example. Want me to walk through it that way?`,
        `Okay, **${S}**, I like where your head's at. What's the bit that's tripping you up: the concept, how it works, or how to actually use it?`,
        `Hmm, let's untangle **${S}** together. If you give me one concrete example of what you're trying to do, I can get way more specific.`,
        `Love it. For **${S}**, the trick is usually to shrink it down to the simplest version first, then build up. Where do you want to begin?`,
        `Ha, **${S}** is a fun one to dig into. Tell me what you already know and I'll fill in the gaps.`,
      ];
      const formal = [
        `A rigorous treatment of **${S}** should address (1) definition and scope, (2) underlying mechanisms, and (3) applications and limitations. Which dimension should I develop first?`,
        `Regarding **${S}**: the analysis depends on your constraints and objectives. Please specify the context (academic, practical, comparative) so I can structure the response appropriately.`,
        `To evaluate **${S}** effectively, I would decompose it into components, examine their interactions, and assess trade-offs. Shall I proceed on that basis?`,
        `**${S}** can be approached from theoretical and applied perspectives. Indicate which you require and I will provide a focused, structured explanation.`,
        `A precise answer on **${S}** requires additional detail. Please state the specific question or the outcome you are aiming for.`,
      ];
      body = pick(tone === "casual" ? casual : formal, n + S.length);
      if (like && n % 3 === 0) body += T(` Since you're into ${like.v}, I can use that as an example if it helps!`, ` Given your stated interest in ${like.v}, I can contextualise accordingly.`);
      body += T("\n\n(Demo mode: my built-in knowledge is limited, so for deep dives, connect a live model.)", "\n\n_Demo mode: local knowledge base only; connect a live model for in-depth content._");
    }
  }
  return { text: body, tone };
}

/* ───────────────────────── Helpers ───────────────────────── */
const CODE_EXT = ["js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "go", "rs", "html", "css", "json", "sh", "php", "rb"];
const TEXT_EXT = ["txt", "md", "csv", "log"];
const fmtSize = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const uid = () => Math.random().toString(36).slice(2, 10);

function classify(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (file.type.startsWith("image/")) return "image";
  if (ext === "pdf") return "pdf";
  if (CODE_EXT.includes(ext)) return "code";
  if (TEXT_EXT.includes(ext) || file.type.startsWith("text/")) return "text";
  return null;
}

async function readAttachment(file) {
  const kind = classify(file);
  if (!kind) return null;
  const a = { id: uid(), name: file.name, size: file.size, kind };
  if (kind === "image" || kind === "pdf") a.dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(file); });
  if (kind === "image") {
    a.preview = URL.createObjectURL(file);
    a.dims = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(`${i.naturalWidth}×${i.naturalHeight}px`);
      i.onerror = () => res("");
      i.src = a.preview;
    });
  } else if (kind !== "pdf") {
    a.content = (await file.text()).slice(0, 20000);
  }
  return a;
}

const KindIcon = ({ kind, size = 16 }) =>
  kind === "image" ? <ImageIcon size={size} /> : kind === "code" ? <FileCode2 size={size} /> : <FileText size={size} />;

const PROVIDERS = {
  demo: { label: "Demo (offline, scripted)" },
  anthropic: { label: "Claude (Anthropic)", model: "claude-sonnet-5-5" },
  gemini: { label: "Google Gemini (free tier)", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
  groq: { label: "Groq (free tier, text only)", base: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  openrouter: { label: "OpenRouter", base: "https://openrouter.ai/api/v1", model: "openrouter/auto" },
};
const DEFAULT_CFG = { provider: "demo", key: "", model: "" };
const SYSTEM = `You are Lumina, a premium, thoughtful AI assistant inside a chat app.
- Adaptive tone: if the user is casual or playful, reply warmly like a smart friend (relaxed, brief, natural, light emoji at most). If they are technical, academic or formal, reply with an authoritative, analytical, well-structured tone.
- Actually do the task: write, explain, debug, summarise, plan, translate, calculate. Give complete, specific answers, never filler or generic replies.
- Use the whole conversation. Remember what the user told you and refer back to it when relevant.
- When files or images are attached, work from their real contents.
- Use Markdown (short paragraphs, lists, fenced code blocks). Be concise unless depth is requested. Never repeat earlier answers verbatim.`;

function toApiMessages(history, vision, anthropic) {
  return history.filter((m) => m.id !== "g" && !m.error).map((m) => {
    if (m.role === "assistant") return { role: "assistant", content: m.text };
    const parts = []; let text = m.text;
    for (const a of m.attachments || []) {
      if (a.content) text += `\n\n[Attached file: ${a.name}]\n${a.content}`;
      else if (a.kind === "image" && vision && a.dataUrl) parts.push(anthropic
        ? { type: "image", source: { type: "base64", media_type: a.dataUrl.slice(5, a.dataUrl.indexOf(";")), data: a.dataUrl.split(",")[1] } }
        : { type: "image_url", image_url: { url: a.dataUrl } });
      else if (a.kind === "pdf" && anthropic && a.dataUrl) parts.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.dataUrl.split(",")[1] } });
      else text += `\n\n[Attached ${a.kind}: ${a.name}. This model cannot read its contents.]`;
    }
    return parts.length ? { role: "user", content: [...parts, { type: "text", text }] } : { role: "user", content: text };
  });
}

async function callLLM(cfg, history, tone) {
  const P = PROVIDERS[cfg.provider], model = cfg.model || P.model, anth = cfg.provider === "anthropic";
  const system = `${SYSTEM}\nThe user's latest message reads as ${tone === "casual" ? "casual/playful" : "technical/formal"}; match that register.`;
  const messages = toApiMessages(history, cfg.provider !== "groq", anth);
  const res = anth
    ? await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model, max_tokens: 2048, system, messages }),
      })
    : await fetch(`${P.base}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages] }),
      });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return anth ? data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n") : data.choices[0].message.content;
}

function Rich({ text }) {
  const inline = (line) => line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) =>
    p.startsWith("**") ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
      : p.startsWith("`") && p.length > 2 ? <code key={j} className="rounded px-1.5 py-0.5 text-[0.85em]" style={{ background: "var(--card)" }}>{p.slice(1, -1)}</code> : p);
  return text.split("```").map((seg, i) => {
    if (i % 2) return <pre key={i} className="my-2 overflow-x-auto rounded-xl border border-[var(--line)] p-3 text-[13px] leading-snug" style={{ background: "var(--card)" }}><code>{seg.replace(/^[^\n]*\n/, "")}</code></pre>;
    return seg.split("\n").map((line, j) => {
      const k = `${i}-${j}`, h = line.match(/^#{1,4}\s+(.*)/), b = line.match(/^\s*[-*]\s+(.*)/);
      if (h) return <p key={k} className="pt-2 font-semibold">{inline(h[1])}</p>;
      if (b) return <p key={k} className="pl-3">• {inline(b[1])}</p>;
      return <p key={k} className={line.startsWith("•") ? "pl-2" : ""} style={{ minHeight: line ? undefined : "0.6em" }}>{inline(line)}</p>;
    });
  });
}

const ENV = import.meta.env || {};
const CHAIN = (() => {
  const keys = { anthropic: ENV.VITE_ANTHROPIC_KEY, gemini: ENV.VITE_GEMINI_KEY, groq: ENV.VITE_GROQ_KEY, openrouter: ENV.VITE_OPENROUTER_KEY };
  if (ENV.VITE_LLM_KEY && PROVIDERS[ENV.VITE_LLM_PROVIDER]) keys[ENV.VITE_LLM_PROVIDER] ||= ENV.VITE_LLM_KEY; // older single-key setup
  const order = [ENV.VITE_LLM_PROVIDER, "anthropic", "gemini", "groq", "openrouter"].filter((p, i, a) => PROVIDERS[p] && p !== "demo" && a.indexOf(p) === i);
  return order.filter((p) => (keys[p] || "").trim()).map((p) => ({ provider: p, key: keys[p].trim(), model: (ENV[`VITE_${p.toUpperCase()}_MODEL`] || "").trim() }));
})();
// Tries the preferred provider first, then falls back to the next one that has a key.
async function callWithFallback(history, tone) {
  let last;
  for (const c of CHAIN) { try { return await callLLM(c, history, tone); } catch (e) { last = e; } }
  throw last;
}

const GREETING = { id: "g", role: "assistant", tone: "casual", text: "Hi, I'm Lumina. Ask me anything, drop in a file or image, or just say hello. I'll match your tone and remember what we talk about.", attachments: [] };
const newChat = () => ({ id: uid(), title: "New conversation", messages: [GREETING] });

/* ───────────────────────── Main component ───────────────────────── */
export default function LuminaAI() {
  const [dark, setDark] = useState(true);
  const [chats, setChats] = useState(() => [newChat()]);
  const [activeId, setActiveId] = useState(() => chats?.[0]?.id);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState([]);
  const [typing, setTyping] = useState(false);
  const [drag, setDrag] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const live = CHAIN.length > 0;
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const taRef = useRef(null);
  const dragDepth = useRef(0);

  const active = useMemo(() => chats.find((c) => c.id === activeId) || chats[0], [chats, activeId]);
  const messages = active.messages; // the reactive `messages` array = full persistent memory

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  useEffect(() => {
    const t = taRef.current;
    if (t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 180) + "px"; }
  }, [input]);

  const addFiles = useCallback(async (list) => {
    setError("");
    const out = [];
    for (const f of Array.from(list)) {
      if (f.size > 10 * 1048576) { setError(`${f.name} is over 10 MB.`); continue; }
      const a = await readAttachment(f);
      a ? out.push(a) : setError(`${f.name} isn't supported. Use images, PDF, text or code files.`);
    }
    setPending((p) => [...p, ...out]);
  }, []);

  const send = () => {
    const text = input.trim();
    if ((!text && !pending.length) || typing) return;
    const userMsg = { id: uid(), role: "user", text: text || "Please look at the attached file.", attachments: pending };
    const history = [...messages, userMsg];
    const cid = active.id;
    setChats((cs) => cs.map((c) => c.id === cid
      ? { ...c, title: c.title === "New conversation" ? (text || pending[0].name).slice(0, 34) : c.title, messages: history } : c));
    setInput(""); setPending([]); setTyping(true);
    const finish = (reply) => {
      setChats((cs) => cs.map((c) => c.id === cid
        ? { ...c, messages: [...c.messages, { id: uid(), role: "assistant", attachments: [], ...reply }] } : c));
      setTyping(false);
    };
    if (live) {
      const tone = detectTone(userMsg.text);
      callWithFallback(history, tone).then((t) => finish({ text: t, tone }))
        .catch((e) => finish({ text: `**Couldn't get a reply.** ${e.message}\nPlease try again in a moment.`, tone, error: true }));
    } else {
      const reply = generateReply(userMsg.text, userMsg.attachments, history);
      setTimeout(() => finish(reply), 700 + Math.min(reply.text.length * 4, 1400));
    }
  };

  const startNew = () => {
    const c = newChat();
    setChats((cs) => [c, ...cs]); setActiveId(c.id); setPending([]); setSidebar(false);
  };
  const remove = (id) => {
    setChats((cs) => {
      const next = cs.filter((c) => c.id !== id);
      if (!next.length) { const c = newChat(); setActiveId(c.id); return [c]; }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const onDrop = (e) => { e.preventDefault(); dragDepth.current = 0; setDrag(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); };
  const lastTone = [...messages].reverse().find((m) => m.role === "assistant" && m.id !== "g")?.tone;

  return (
    <div style={THEMES[dark ? "dark" : "light"]} className="relative flex h-screen w-full overflow-hidden text-[var(--text)] transition-colors duration-500"
      onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setDrag(true); }}
      onDragLeave={() => { if (--dragDepth.current <= 0) setDrag(false); }}
      onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <style>{`
        @keyframes lm-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes lm-dot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
        @keyframes lm-breathe{0%,100%{opacity:.55}50%{opacity:1}}
        .lm-rise{animation:lm-rise .35s ease both}
        .lm-scroll::-webkit-scrollbar{width:8px}.lm-scroll::-webkit-scrollbar-thumb{background:var(--line);border-radius:8px}
        @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      {/* ambient background */}
      <div className="absolute inset-0 -z-0 bg-[var(--bg)]" />
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[480px] w-[480px] rounded-full blur-[120px]" style={{ background: "var(--glow)" }} />

      {/* mobile scrim */}
      {sidebar && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebar(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--line)] backdrop-blur-2xl transition-transform duration-300 md:static md:translate-x-0 ${sidebar ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--panel)" }}>
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Sparkles size={16} /></div>
            <span className="text-lg font-semibold tracking-tight">Lumina</span>
          </div>
          <button className="rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--text)] md:hidden" onClick={() => setSidebar(false)} aria-label="Close sidebar"><X size={18} /></button>
        </div>
        <div className="px-3">
          <button onClick={startNew} className="flex w-full items-center gap-2 rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm font-medium transition hover:bg-[var(--card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
            <Plus size={16} /> New chat
          </button>
        </div>
        <p className="px-5 pb-1 pt-5 text-xs text-[var(--muted)]">Recent</p>
        <nav className="lm-scroll flex-1 space-y-0.5 overflow-y-auto px-3">
          {chats.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-xl transition ${c.id === active.id ? "bg-[var(--card)]" : "hover:bg-[var(--card)]"}`}>
              <button onClick={() => { setActiveId(c.id); setSidebar(false); }} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-sm">
                <MessageSquare size={15} className={c.id === active.id ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                <span className="truncate">{c.title}</span>
              </button>
              <button onClick={() => remove(c.id)} aria-label={`Delete ${c.title}`} className="mr-2 rounded-md p-1 text-[var(--muted)] opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100"><Trash2 size={14} /></button>
            </div>
          ))}
        </nav>
        {/* profile */}
        <div className="relative border-t border-[var(--line)] p-3">
          {menu && (
            <div className="lm-rise absolute bottom-[68px] left-3 right-3 overflow-hidden rounded-xl border border-[var(--line)] p-1 shadow-2xl backdrop-blur-2xl" style={{ background: "var(--panel)" }}>
              {[[User, "Profile"], [LogOut, "Sign out"]].map(([I, l]) => (
                <button key={l} onClick={() => setMenu(false)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-[var(--card)]"><I size={15} className="text-[var(--muted)]" />{l}</button>
              ))}
            </div>
          )}
          <button onClick={() => setMenu((m) => !m)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--card)]">
            <div className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>S</div>
            <div className="min-w-0"><p className="truncate text-sm font-medium">Student</p><p className="truncate text-xs text-[var(--muted)]">Demo account</p></div>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 backdrop-blur-xl md:px-8" style={{ background: "var(--panel)" }}>
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--card)] md:hidden" onClick={() => setSidebar(true)} aria-label="Open sidebar"><Menu size={18} /></button>
            <h1 className="truncate text-sm font-medium">{active.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {lastTone && (
              <span className="hidden items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)", animation: "lm-breathe 2.4s infinite" }} />
                {lastTone === "casual" ? "Peer tone" : "Analytical tone"}
              </span>
            )}
            <button onClick={() => setDark((d) => !d)} aria-label="Toggle theme" className="rounded-xl p-2 text-[var(--muted)] transition hover:bg-[var(--card)] hover:text-[var(--text)]">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="lm-scroll flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((m) => (
              <div key={m.id} className={`lm-rise flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="mr-3 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Sparkles size={13} /></div>
                )}
                <div className={`max-w-[85%] ${m.role === "user" ? "rounded-2xl rounded-br-md px-4 py-3" : "py-1"} text-[15px] leading-relaxed`} style={m.role === "user" ? { background: "var(--user)" } : undefined}>
                  {m.attachments?.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {m.attachments.map((a) => a.kind === "image"
                        ? <img key={a.id} src={a.preview} alt={a.name} className="h-28 rounded-xl border border-[var(--line)] object-cover" />
                        : <span key={a.id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs"><KindIcon kind={a.kind} size={13} />{a.name}</span>)}
                    </div>
                  )}
                  <div className="space-y-1"><Rich text={m.text} /></div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-1.5 pl-10">
                {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)", animation: `lm-dot 1.2s ${i * 0.15}s infinite` }} />)}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* ── Composer ── */}
        <div className="px-4 pb-5 md:px-8">
          <div className="mx-auto max-w-3xl">
            {error && <p role="alert" className="mb-2 text-sm text-red-400">{error}</p>}
            <div className="rounded-2xl border border-[var(--line)] p-2.5 backdrop-blur-xl transition focus-within:shadow-[0_0_0_1px_var(--accent),0_0_40px_var(--glow)]" style={{ background: "var(--panel)" }}>
              {pending.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 px-1 pt-1">
                  {pending.map((a) => (
                    <div key={a.id} className="lm-rise flex items-center gap-2 rounded-xl border border-[var(--line)] py-1.5 pl-1.5 pr-2 text-xs" style={{ background: "var(--card)" }}>
                      {a.kind === "image" ? <img src={a.preview} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-lg text-[var(--accent)]" style={{ background: "var(--card)" }}><KindIcon kind={a.kind} /></span>}
                      <span className="max-w-[140px] truncate font-medium">{a.name}</span>
                      <span className="text-[var(--muted)]">{fmtSize(a.size)}</span>
                      <button onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))} aria-label={`Remove ${a.name}`} className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--text)]"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf,.txt,.md,.csv,.log,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.go,.rs,.html,.css,.json,.sh,.php,.rb"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <button onClick={() => fileRef.current?.click()} aria-label="Attach files" className="rounded-xl p-2.5 text-[var(--muted)] transition hover:bg-[var(--card)] hover:text-[var(--text)]"><Paperclip size={19} /></button>
                <textarea ref={taRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Message Lumina"
                  className="max-h-[180px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-[15px] outline-none placeholder:text-[var(--muted)]" />
                <button onClick={send} disabled={typing || (!input.trim() && !pending.length)} aria-label="Send message"
                  className="grid h-10 w-10 place-items-center rounded-xl transition hover:scale-105 disabled:scale-100 disabled:opacity-30"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><ArrowUp size={18} /></button>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-[var(--muted)]">Lumina can make mistakes. Shift+Enter adds a new line.</p>
          </div>
        </div>

        {/* drag overlay */}
        {drag && (
          <div className="lm-rise absolute inset-3 z-50 grid place-items-center rounded-3xl border-2 border-dashed backdrop-blur-md" style={{ borderColor: "var(--accent)", background: "var(--panel)" }}>
            <div className="text-center">
              <UploadCloud size={40} className="mx-auto mb-3 text-[var(--accent)]" />
              <p className="text-lg font-medium">Drop files to attach</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Images, PDF, text and code files up to 10 MB</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
