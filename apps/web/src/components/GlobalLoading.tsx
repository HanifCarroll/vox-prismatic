import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

export default function GlobalLoading({
    message = "Loading…",
    enterDelay = 150,
    exitMs = 300,
}: {
    message?: string;
    enterDelay?: number;
    exitMs?: number;
}) {
    // Show during initial loads and navigations using router pending status
    const isNavigating = useRouterState({
        select: (s) => s.status === "pending",
    });
    const isFetching = useIsFetching() > 0;
    const shouldShow = isNavigating || isFetching;

    // Start hidden; only show after a small delay to avoid flicker
    const [visible, setVisible] = useState(false);
    const enterT = useRef<number | null>(null);

    useEffect(() => {
        if (enterT.current) window.clearTimeout(enterT.current);
        if (shouldShow) {
            // Delay the show to avoid flashing on quick navigations
            enterT.current = window.setTimeout(
                () => setVisible(true),
                Math.max(0, enterDelay)
            );
        } else {
            // Hide immediately; AnimatePresence will handle fade-out
            setVisible(false);
        }
        return () => {
            if (enterT.current) window.clearTimeout(enterT.current);
        };
    }, [shouldShow, enterDelay]);

    const mainEl =
        typeof document !== "undefined"
            ? (document.querySelector("main") as HTMLElement | null)
            : null;
    const overlay = (
        <AnimatePresence>
            {visible ? (
                <motion.div
                    key="global-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: exitMs / 1000, ease: "easeInOut" }}
                    className="absolute inset-0 z-[50] bg-zinc-50/90"
                >
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-zinc-900" />
                            <div className="text-sm text-zinc-600">
                                {message}
                            </div>
                            <div className="h-1 w-48 overflow-hidden rounded bg-zinc-200">
                                <motion.div
                                    className="h-full w-1/3 bg-zinc-900"
                                    animate={{ x: ["0%", "66%"] }}
                                    transition={{
                                        repeat: Infinity,
                                        repeatType: "reverse",
                                        duration: 1.1,
                                        ease: "easeInOut",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );

    return mainEl ? createPortal(overlay, mainEl) : overlay;
}
