import React from "react";

/**
 * ErnsLogo — Green rounded-square with lightning bolt + "Erns." text.
 *
 * Props:
 *  - size: "sm" | "md" | "lg" — controls icon + text size
 *  - showText: whether to show the "Erns." text
 *  - textClassName: optional extra classes for the text
 */

interface ErnsLogoProps {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
    textClassName?: string;
    className?: string;
}

const sizes = {
    sm: { box: "w-7 h-7 rounded-md", bolt: "w-3.5 h-3.5", text: "text-lg" },
    md: { box: "w-8 h-8 rounded-lg", bolt: "w-4 h-4", text: "text-xl" },
    lg: { box: "w-10 h-10 rounded-xl", bolt: "w-5 h-5", text: "text-2xl" },
};

export function ErnsLogo({ size = "md", showText = true, textClassName, className }: ErnsLogoProps) {
    const s = sizes[size];
    return (
        <span className={`inline-flex items-center gap-2 ${className || ""}`}>
            {/* Green rounded square with lightning bolt */}
            <span className={`${s.box} bg-[#1DB954] flex items-center justify-center shrink-0`}>
                <svg
                    className={`${s.bolt} text-white`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
            </span>
            {showText && (
                <span className={`font-bold text-text-main tracking-tight ${s.text} ${textClassName || ""}`}>
                    Erns<span className="text-[#1DB954]">.</span>
                </span>
            )}
        </span>
    );
}
