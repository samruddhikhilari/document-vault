"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">

            {/* Navigation Bar */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                    ? "bg-white/80 backdrop-blur-lg shadow-sm py-4"
                    : "bg-transparent py-6"
                    }`}
            >
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            DocVault
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/register"
                            className="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6 border border-indigo-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        New: Enhanced encryption standards
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 max-w-4xl mx-auto leading-tight">
                        Secure Document Vault <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                            Your files. Your control.
                        </span>
                    </h1>

                    <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        End-to-end encrypted file storage designed for privacy-first teams and individuals. Store, manage, and share your documents with complete confidence.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/register"
                            className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1"
                        >
                            Start for Free
                        </Link>
                        <Link
                            href="/login"
                            className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all hover:-translate-y-1"
                        >
                            Log in
                        </Link>
                    </div>

                    <div className="mt-16 flex items-center justify-center gap-8 text-gray-400 grayscale opacity-60">
                        {/* Simple Logo shapes for trust validation */}
                        <div className="h-8 w-24 bg-current rounded opacity-20"></div>
                        <div className="h-8 w-24 bg-current rounded opacity-20"></div>
                        <div className="h-8 w-24 bg-current rounded opacity-20"></div>
                        <div className="h-8 w-24 bg-current rounded opacity-20"></div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-white relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Enterprise-grade security for everyone
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            We&apos;ve built our platform from the ground up to ensure your data remains private, secure, and always accessible when you need it.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Feature 1 */}
                        <div className="group p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Client-Side Encryption
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Your files are encrypted on your device before they ever touch our servers. Only you hold the keys to your data.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Secure Storage
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Reliable, redundant cloud storage ensures your documents are safe against data loss and accessible from anywhere.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-pink-100 hover:bg-pink-50/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                            <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center text-pink-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Private Access
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Granular sharing controls allow you to share documents securely with expiring links and password protection.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 backdrop-blur-3xl"></div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">
                        Start Protecting Your Files Today
                    </h2>
                    <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                        Join thousands of users who trust DocVault with their most sensitive documents. No credit card required.
                    </p>
                    <Link
                        href="/register"
                        className="inline-block px-10 py-4 bg-white text-gray-900 text-lg font-bold rounded-full hover:bg-gray-100 transition-transform hover:-translate-y-1 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        Create Free Account
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-50 border-t border-gray-200 py-12">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-violet-600 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <span className="font-bold text-gray-900">DocVault</span>
                    </div>

                    <div className="text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} DocVault. All rights reserved.
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">Built with Next.js & Tailwind</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

