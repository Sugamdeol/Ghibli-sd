// Configuration Settings
const CONFIG = {
    // API settings
    api: {
        imageUrl: "https://image.pollinations.ai/prompt/",
        authCode: "beesknees", // Authentication code for the API
        defaultModel: "flux", // Default image generation model
        analyzeModel: "openai-large", // Model for detailed image analysis
        noLogo: true, // Remove logo from generated images
    },
    
    // Image processing settings
    imageProcessing: {
        maxWidth: 1024, // Maximum width for images before resizing
        maxHeight: 1024, // Maximum height for images before resizing
        quality: 0.9, // JPEG quality for resized images (0.0 to 1.0)
        fileTypes: ["image/jpeg", "image/png", "image/webp"], // Allowed file types
        maxSizeMB: 20, // Maximum file size in MB
    },
    
    // Style presets for Ghibli transformations
    stylePresets: {
        balanced: "Studio Ghibli animation style, hand-drawn, vibrant colors, detailed scenery, soft lighting, whimsical atmosphere",
        painterly: "Studio Ghibli painterly style, watercolor backgrounds, detailed nature elements, Hayao Miyazaki inspired art, soft pastel colors",
        dramatic: "Studio Ghibli dramatic style, fantasy landscapes, magical elements, dynamic lighting, emotional atmosphere, cinematic composition"
    },
    
    // Random seed generation
    seedRange: {
        min: 1,
        max: 9999999
    }
};