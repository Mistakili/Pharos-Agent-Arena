import { Link } from "wouter";
import { BookOpen, Github, Play } from "lucide-react";
import { PHAROS, SUBJECT } from "@/engine/compliance";

export function SiteHeader({ active }: { active: "demo" | "docs" }) {
  return (
    <div className="bg-zinc-950 border-b border-zinc-900 py-2 px-4 sm:px-6 flex flex-wrap justify-between items-center gap-3 text-xs font-mono">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-emerald-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {PHAROS.name}
        </div>
        <span className="text-zinc-600 hidden sm:inline">|</span>
        <span className="text-zinc-500 hidden md:inline">Chain ID: {PHAROS.chainId}</span>
        <span className="text-zinc-600 hidden lg:inline">|</span>
        <span className="text-zinc-500 hidden lg:inline truncate max-w-[220px]">RPC: {PHAROS.rpcUrl}</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
              active === "demo"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            <Play className="w-3 h-3" />
            Demo
          </Link>
          <Link
            href="/docs"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
              active === "docs"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Docs
          </Link>
        </nav>
        <a
          href="https://github.com/Mistakili/Pharos-Agent-Arena"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-emerald-400 transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
        <div className="text-zinc-500 hidden sm:flex items-center gap-2">
          <span>SUBJECT:</span>
          <span className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded">
            {SUBJECT.slice(0, 6)}...{SUBJECT.slice(-4)}
          </span>
        </div>
      </div>
    </div>
  );
}