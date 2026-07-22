const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        return process.env.NEXT_PUBLIC_BACKEND_URL;
    }
    return "https://omnivault.onrender.com";
};

export const HOST = getBackendUrl();

export const API_PATHS = {
    SCAN: "/v1/scan",
    SYNTHESIZE: "/v1/synthesize/stream",
    SAVE: "/v1/synthesize/save",
    QUIZ: "/v1/quiz/generate",
    EVALUATE: "/v1/quiz/evaluate",
    WS: "/v1/ws"
}