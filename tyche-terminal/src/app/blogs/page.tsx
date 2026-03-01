"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";

interface BlogPost {
    _id: string;
    title: string;
    content: string;
    excerpt: string;
    author: { id: string; name: string; email: string };
    tags: string[];
    published: boolean;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
}

interface UserInfo {
    id: string;
    name: string;
    email: string;
    isAdmin?: boolean;
}

const TAG_OPTIONS = ["Earnings", "Analysis", "Market Update", "Technical", "SEC Filing", "Opinion", "Tutorial", "Research"];

export default function BlogsPage() {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
    const [viewingBlog, setViewingBlog] = useState<BlogPost | null>(null);

    // Editor state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => d.success && setUser(d.user))
            .catch(() => { });
    }, []);

    const fetchBlogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/blogs");
            const data = await res.json();
            if (data.success) setBlogs(data.blogs);
        } catch {
            console.error("Failed to fetch blogs");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBlogs(); }, [fetchBlogs]);

    const openEditor = (blog?: BlogPost) => {
        if (blog) {
            setEditingBlog(blog);
            setTitle(blog.title);
            setContent(blog.content);
            setTags(blog.tags);
        } else {
            setEditingBlog(null);
            setTitle("");
            setContent("");
            setTags([]);
        }
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) return;
        setSaving(true);
        try {
            const url = editingBlog ? `/api/blogs/${editingBlog._id}` : "/api/blogs";
            const method = editingBlog ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, tags, published: true }),
            });
            if (res.ok) {
                setShowEditor(false);
                fetchBlogs();
            }
        } catch {
            console.error("Failed to save blog");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this blog post?")) return;
        try {
            const res = await fetch(`/api/blogs/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Failed to delete blog post");
                return;
            }
            fetchBlogs();
        } catch {
            console.error("Failed to delete blog");
        }
    };

    const toggleTag = (tag: string) => {
        setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
        <DashboardLayout title="Blogs" subtitle="Share insights and analysis with the community">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted">{blogs.length} published posts</span>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openEditor()}
                    className="px-5 py-2.5 bg-gradient-to-r from-primary to-emerald-400 text-black rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(0,230,118,0.15)]"
                >
                    + New Post
                </motion.button>
            </div>

            {/* Blog Grid */}
            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
                            <div className="h-4 bg-white/5 rounded w-3/4 mb-3" />
                            <div className="h-3 bg-white/5 rounded w-full mb-2" />
                            <div className="h-3 bg-white/5 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : blogs.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-text-main text-lg font-semibold mb-2">No blog posts yet</p>
                    <p className="text-text-muted text-sm mb-6">Be the first to share your market insights</p>
                    <button onClick={() => openEditor()} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold">
                        Write Your First Post
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {blogs.map((blog, i) => (
                        <motion.div
                            key={blog._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="group bg-surface/80 backdrop-blur-sm border border-border rounded-2xl p-6 hover:border-primary/30 transition-all cursor-pointer"
                            onClick={() => setViewingBlog(blog)}
                        >
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {blog.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <h3 className="font-bold text-text-main text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {blog.title}
                            </h3>
                            <p className="text-sm text-text-muted line-clamp-3 mb-4">{blog.excerpt}</p>
                            <div className="flex items-center justify-between text-xs text-text-muted">
                                <span>{blog.author.name}</span>
                                <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                            </div>
                            {(user?.id === blog.author.id || user?.isAdmin) && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                                    {user?.id === blog.author.id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditor(blog); }}
                                            className="text-xs text-primary hover:text-primary/80"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(blog._id); }}
                                        className="text-xs text-loss hover:text-loss/80"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* View Blog Modal */}
            <AnimatePresence>
                {viewingBlog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setViewingBlog(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-surface border border-border rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-8">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {viewingBlog.tags.map((tag) => (
                                        <span key={tag} className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{tag}</span>
                                    ))}
                                </div>
                                <h1 className="text-2xl font-bold text-text-main mb-3">{viewingBlog.title}</h1>
                                <div className="flex items-center gap-3 text-sm text-text-muted mb-6 pb-6 border-b border-border">
                                    <span>By {viewingBlog.author.name}</span>
                                    <span>•</span>
                                    <span>{formatDate(viewingBlog.publishedAt || viewingBlog.createdAt)}</span>
                                </div>
                                <div className="prose prose-invert max-w-none text-text-main leading-relaxed whitespace-pre-wrap">
                                    {viewingBlog.content}
                                </div>
                            </div>
                            <div className="px-8 py-4 border-t border-border flex justify-end">
                                <button onClick={() => setViewingBlog(null)} className="px-4 py-2 text-sm text-text-muted hover:text-text-main transition-colors">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Editor Modal */}
            <AnimatePresence>
                {showEditor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-surface border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="px-8 py-6 border-b border-border flex items-center justify-between">
                                <h2 className="text-lg font-bold text-text-main">
                                    {editingBlog ? "Edit Post" : "New Post"}
                                </h2>
                                <button onClick={() => setShowEditor(false)} className="text-text-muted hover:text-text-main transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-8 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Your post title..."
                                        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text-main placeholder-text-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-lg font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-2">Tags</label>
                                    <div className="flex flex-wrap gap-2">
                                        {TAG_OPTIONS.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tags.includes(tag)
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-white/5 text-text-muted border border-border hover:border-primary/30"
                                                    }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-2">Content</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Write your analysis, insights, or market commentary..."
                                        rows={15}
                                        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text-main placeholder-text-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
                                    />
                                </div>
                            </div>
                            <div className="px-8 py-4 border-t border-border flex items-center justify-between">
                                <button onClick={() => setShowEditor(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text-main">
                                    Cancel
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSave}
                                    disabled={saving || !title.trim() || !content.trim()}
                                    className="px-6 py-2.5 bg-gradient-to-r from-primary to-emerald-400 text-black rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,230,118,0.15)]"
                                >
                                    {saving ? "Publishing..." : editingBlog ? "Update Post" : "Publish Post"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
