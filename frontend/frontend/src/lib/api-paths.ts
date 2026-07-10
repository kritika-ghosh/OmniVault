export const HOST = process.env.NEXT_PUBLIC_BACKEND_URL || "https://omnivault.onrender.com";

export const API_PATHS = {
    SCAN: "/v1/scan",
    SYNTHESIZE: "/v1/synthesize/stream",
    SAVE: "/v1/synthesize/save",
    QUIZ: "/v1/quiz/generate",
    EVALUATE: "/v1/quiz/evaluate",
    WS: "/v1/ws"
}