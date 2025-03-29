document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const originalImage = document.getElementById('originalImage');
    const resultImage = document.getElementById('resultImage');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const newImageBtn = document.getElementById('newImageBtn');
    
    // State variables
    let currentFile = null;
    let transformedImageURL = null;
    
    // Event Listeners
    initializeEventListeners();
    
    // Functions
    function initializeEventListeners() {
        // Drag and drop functionality
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('active');
        });
        
        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('active');
        });
        
        dropArea.addEventListener('drop', handleFileDrop);
        
        // Click to upload
        dropArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
        
        // Convert button
        convertBtn.addEventListener('click', transformImage);
        
        // Result actions
        downloadBtn.addEventListener('click', downloadImage);
        shareBtn.addEventListener('click', shareImage);
        newImageBtn.addEventListener('click', resetApp);
    }
    
    async function handleFileDrop(e) {
        e.preventDefault();
        dropArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            await processFile(e.dataTransfer.files[0]);
        }
    }
    
    async function handleFileSelect(e) {
        if (fileInput.files.length) {
            await processFile(fileInput.files[0]);
        }
    }
    
    async function processFile(file) {
        // Validate file type
        if (!CONFIG.imageProcessing.fileTypes.includes(file.type)) {
            showAlert('Please upload a valid image file (JPEG, PNG, or WebP).', 'error');
            return;
        }
        
        // Validate file size
        if (file.size > CONFIG.imageProcessing.maxSizeMB * 1024 * 1024) {
            showAlert(`File size should be less than ${CONFIG.imageProcessing.maxSizeMB}MB. Your file will be resized.`, 'error');
        }
        
        try {
            // Process and resize image if needed
            const processedFile = await resizeImageIfNeeded(file);
            currentFile = processedFile;
            
            // Display original image
            originalImage.src = URL.createObjectURL(processedFile);
            
            // Enable convert button
            convertBtn.disabled = false;
            
            // Show a little preview notification
            showAlert('Image ready for transformation!', 'success');
        } catch (error) {
            console.error('Error processing file:', error);
            showAlert('Error processing your image. Please try again.', 'error');
        }
    }
    
    async function resizeImageIfNeeded(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Check if resizing is needed
                const { width, height } = img;
                const maxWidth = CONFIG.imageProcessing.maxWidth;
                const maxHeight = CONFIG.imageProcessing.maxHeight;
                
                if (width <= maxWidth && height <= maxHeight && file.size <= CONFIG.imageProcessing.maxSizeMB * 1024 * 1024) {
                    URL.revokeObjectURL(img.src);
                    resolve(file); // No need to resize
                    return;
                }
                
                // Calculate new dimensions
                let newWidth = width;
                let newHeight = height;
                
                if (width > maxWidth) {
                    newWidth = maxWidth;
                    newHeight = Math.floor(height * (maxWidth / width));
                }
                
                if (newHeight > maxHeight) {
                    newHeight = maxHeight;
                    newWidth = Math.floor(newWidth * (maxHeight / newHeight));
                }
                
                // Create canvas for resizing
                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // Convert to blob
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    if (blob) {
                        const resizedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: new Date().getTime()
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', CONFIG.imageProcessing.quality);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to load image'));
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    async function transformImage() {
        if (!currentFile) {
            showAlert('Please upload an image first.', 'error');
            return;
        }
        
        // Show results container and loading state
        resultsContainer.classList.remove('hidden');
        loadingOverlay.style.display = 'flex';
        resultImage.style.opacity = '0.3';
        convertBtn.disabled = true;
        
        try {
            // Get selected style
            const selectedStyle = document.querySelector('input[name="style"]:checked').value;
            const stylePrompt = CONFIG.stylePresets[selectedStyle];
            
            // Generate random seed for variety
            const seed = generateRandomSeed();
            
            // Convert image to base64 for analysis
            const base64Image = await fileToBase64(currentFile);
            
            // Analyze the image to understand what's in it
            const imageDescription = await analyzeImage(base64Image);
            
            // Construct the full prompt
            const fullPrompt = constructPrompt(imageDescription, stylePrompt);
            
            // Generate transformed image
            const transformedURL = await generateGhibliImage(fullPrompt, seed);
            transformedImageURL = transformedURL;
            
            // Display the result
            resultImage.onload = () => {
                loadingOverlay.style.display = 'none';
                resultImage.style.opacity = '1';
            };
            resultImage.src = transformedURL;
            
            showAlert('Transformation complete!', 'success');
        } catch (error) {
            console.error('Error transforming image:', error);
            loadingOverlay.style.display = 'none';
            showAlert('Error transforming your image. Please try again.', 'error');
            convertBtn.disabled = false;
        }
    }
    
    function generateRandomSeed() {
        return Math.floor(Math.random() * 
            (CONFIG.seedRange.max - CONFIG.seedRange.min + 1)) + CONFIG.seedRange.min;
    }
    
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async function analyzeImage(base64Image) {
        try {
            const prompt = "Describe this image in detail, focusing on main subjects, colors, style, mood, and setting. Be concise but comprehensive.";
            const requestBody = {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            { "type": "text", "text": prompt },
                            { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${base64Image}` } }
                        ]
                    }
                ],
                "model": "openai",
                "code": CONFIG.api.authCode
            };

            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.text();
            return data.trim();
        } catch (error) {
            console.error('Error analyzing image:', error);
            // Return a generic description if analysis fails
            return "Photograph";
        }
    }
    
    function constructPrompt(imageDescription, stylePrompt) {
        return `Transform this image: ${imageDescription}. Style: ${stylePrompt}`;
    }
    
    async function generateGhibliImage(prompt, seed) {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${CONFIG.api.imageUrl}${encodedPrompt}?model=${CONFIG.api.defaultModel}&seed=${seed}&code=${CONFIG.api.authCode}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return url;
        } catch (error) {
            console.error('Error generating image:', error);
            throw error;
        }
    }
    
    function downloadImage() {
        if (!transformedImageURL) return;
        
        const a = document.createElement('a');
        a.href = transformedImageURL;
        a.download = `ghibli-art-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showAlert('Image downloaded!', 'success');
    }
    
    async function shareImage() {
        if (!transformedImageURL) return;
        
        try {
            if (navigator.share) {
                const response = await fetch(transformedImageURL);
                const blob = await response.blob();
                const file = new File([blob], 'ghibli-artwork.png', { type: 'image/png' });
                
                await navigator.share({
                    title: 'My Ghibli Artwork',
                    text: 'Check out this Ghibli-style artwork I created!',
                    files: [file]
                });
            } else {
                // Fallback if Web Share API not available
                const dummyInput = document.createElement('input');
                document.body.appendChild(dummyInput);
                dummyInput.value = transformedImageURL;
                dummyInput.select();
                document.execCommand('copy');
                document.body.removeChild(dummyInput);
                
                showAlert('Image URL copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            showAlert('Error sharing image. URL copied instead.', 'error');
        }
    }
    
    function resetApp() {
        // Reset state
        currentFile = null;
        transformedImageURL = null;
        
        // Reset UI
        fileInput.value = '';
        convertBtn.disabled = true;
        resultsContainer.classList.add('hidden');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    function showAlert(message, type = 'success') {
        const alert = document.createElement('div');
        alert.className = `custom-alert ${type}`;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        // Remove alert after 3 seconds
        setTimeout(() => {
            alert.classList.add('slide-out');
            setTimeout(() => {
                document.body.removeChild(alert);
            }, 300);
        }, 3000);
    }
});