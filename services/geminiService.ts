import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";
import { generateDynamicPrompt, generateVariationPrompt, generateComposePrompt, generateMagicEditPrompt, SCENE_IDEAS_PROMPT, IMPROVE_PROMPT_PROMPT, COMPOSE_IDEAS_PROMPT, MAGIC_EDIT_MASKED_IDEAS_PROMPT, MAGIC_EDIT_IMPROVE_PROMPT_PROMPT, COMPOSE_IDEAS_WITH_CONTEXT_PROMPT, IMPROVE_COMPOSE_PROMPT_PROMPT, GENERATE_CAMPAIGN_PROMPTS_PROMPT, GENERATE_ADAPT_PROMPT_PROMPT, generateAdaptImagePrompt } from '../constants';
import { ApiPart } from '../types';

// STRICT: Check for correct Gemini API key environment variable (via Vite define)
if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set. Cannot initialize AI services without API access.");
}

export type BackgroundConfig =
  { type: 'preset'; value: string; } |
  { type: 'ai'; value: string; } |
  { type: 'commercial'; value: string; };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Converts a data URL string to a GoogleGenerativeAI.Part object.
 * @param dataUrl The data URL to convert.
 * @returns The Part object.
 */
const dataUrlToPart = (dataUrl: string): ApiPart => {
    const parts = dataUrl.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    const base64Data = parts[1];
    return {
        inlineData: {
            mimeType,
            data: base64Data,
        },
    };
};


/**
 * Handles the API response, extracting the image or throwing an error.
 * @param response The API response object.
 * @returns The Base64 data URL of the processed image.
 */
const handleApiResponse = (response: GenerateContentResponse): string => {
  if (response.promptFeedback?.blockReason) {
    throw new Error(`Request was blocked: ${response.promptFeedback.blockReason}`);
  }

  const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePart?.inlineData) {
    // FIX: The line was corrupted with extraneous text. It has been corrected to properly construct the data URL from the image part.
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Image generation stopped for reason: ${finishReason}`);
  }

  const textPart = response.candidates?.[0]?.content?.parts?.find(part => part.text);
  if (textPart?.text) {
      throw new Error(`API returned text instead of an image. Response: "${textPart.text}"`);
  }
  
  throw new Error('No image was returned from the API. The response may be empty.');
};


/**
 * Sends one or more images to the Gemini API to generate a single professional product shot.
 * @param imageUrls An array of data URLs for the user's uploaded product images.
 * @param backgroundConfig The configuration for the desired background.
 * @returns A promise that resolves to a data URL for the processed image.
 */
export const generateProShot = async (imageUrls: string[], backgroundConfig: BackgroundConfig): Promise<string> => {
  if (imageUrls.length === 0) {
    throw new Error("No images provided to generate a professional shot.");
  }
  const imageParts = imageUrls.map(dataUrlToPart);
  const prompt = generateDynamicPrompt(backgroundConfig);
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts: [...imageParts, textPart] },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
  });

  return handleApiResponse(response);
};

/**
 * Sends a master image and a new prompt to generate a scene variation.
 * @param masterImageUrl The data URL of the master product image.
 * @param backgroundConfig The configuration for the desired new background.
 * @returns A promise that resolves to a data URL for the new image variation.
 */
export const generateVariation = async (masterImageUrl: string, backgroundConfig: BackgroundConfig): Promise<string> => {
    const masterImagePart = dataUrlToPart(masterImageUrl);
    const prompt = generateVariationPrompt(backgroundConfig);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [masterImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response);
};

/**
 * Helper to load a data URL into an HTMLImageElement.
 * @param url The data URL of the image.
 * @returns A promise that resolves to the loaded HTMLImageElement.
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image for canvas processing: ${err}`));
    img.src = url;
  });
};

/**
 * Generates a dynamic outpainting prompt by analyzing the image's background.
 * @param imageUrl The data URL of the image to analyze.
 * @param aspectRatio The target aspect ratio for the creative direction.
 * @param isMobile Whether the target aspect ratio is for a tall, mobile-style format.
 * @returns A promise that resolves to a descriptive prompt for outpainting.
 */
export const generateAdaptPrompt = async (imageUrl: string, aspectRatio: string, isMobile: boolean): Promise<string> => {
    const imagePart = dataUrlToPart(imageUrl);
    const promptText = GENERATE_ADAPT_PROMPT_PROMPT
        .replace('{ASPECT_RATIO}', aspectRatio)
        .replace('{PLACEMENT_INSTRUCTION}', isMobile 
            ? "The provided image is placed at the top of the canvas. Your task is to creatively envision and describe what a photographer would have captured *below* the current frame to fill the vertical space. Don't just repeat textures; describe a plausible and visually interesting downward extension of the scene."
            : "The provided image is centered on the canvas. Your task is to creatively envision and describe what a photographer would have captured *around* the current frame (e.g., above/below for vertical, left/right for horizontal) to fill the empty space."
        );

    const textPart = { text: promptText };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    const prompt = response.text.trim();
    if (!prompt) {
        console.warn("AI failed to generate a specific adapt prompt, using a generic fallback.");
        return "Extend the background of the image, maintaining the existing style, lighting, and textures.";
    }
    return prompt;
};


/**
 * Adapts an image to a new aspect ratio using a two-step AI process:
 * 1. An AI analyzes the image to generate a custom prompt for outpainting.
 * 2. Another AI uses this prompt, the image, and a mask to perform the outpainting.
 * @param masterImageUrl The data URL of the image to adapt.
 * @param aspectRatio The target aspect ratio (e.g., "9:16").
 * @returns A promise that resolves to a data URL for the new adapted image.
 */
export const adaptImage = async (masterImageUrl: string, aspectRatio: string): Promise<string> => {
    const [arWidth, arHeight] = aspectRatio.split(':').map(Number);
    if (!arWidth || !arHeight) throw new Error("Invalid aspect ratio format.");

    const targetAspectRatio = arWidth / arHeight;
    const isMobileAspectRatio = targetAspectRatio < 1; // Taller than wide is "mobile"

    // Step 1: Generate a custom, context-aware prompt for the outpainting task.
    const customSceneDescription = await generateAdaptPrompt(masterImageUrl, aspectRatio, isMobileAspectRatio);

    const originalImage = await loadImage(masterImageUrl);
    const originalAspectRatio = originalImage.naturalWidth / originalImage.naturalHeight;

    let targetWidth: number, targetHeight: number;

    // Calculate final dimensions, preserving one original dimension to ensure no cropping
    if (targetAspectRatio > originalAspectRatio) {
        // Target is wider than original, so match height and expand width
        targetHeight = originalImage.naturalHeight;
        targetWidth = Math.round(targetHeight * targetAspectRatio);
    } else {
        // Target is taller than original, so match width and expand height
        targetWidth = originalImage.naturalWidth;
        targetHeight = Math.round(targetWidth / targetAspectRatio);
    }

    // Create the composite canvas with the exact target dimensions
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = targetWidth;
    compositeCanvas.height = targetHeight;
    const compositeCtx = compositeCanvas.getContext('2d');
    if (!compositeCtx) throw new Error("Could not get composite canvas context.");
    
    // Fill background and draw the original image
    compositeCtx.fillStyle = 'lime';
    compositeCtx.fillRect(0, 0, targetWidth, targetHeight);

    const drawX = (targetWidth - originalImage.naturalWidth) / 2;
    let drawY = (targetHeight - originalImage.naturalHeight) / 2;

    if (isMobileAspectRatio) {
        drawY = 0; // Align to top for mobile ratios
    }
    
    compositeCtx.drawImage(originalImage, drawX, drawY);
    const compositeImagePart = dataUrlToPart(compositeCanvas.toDataURL('image/png'));
    
    // Create the corresponding mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = targetWidth;
    maskCanvas.height = targetHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error("Could not get mask canvas context.");
    
    maskCtx.fillStyle = 'white'; // White is the area to be filled by the AI
    maskCtx.fillRect(0, 0, targetWidth, targetHeight);
    maskCtx.fillStyle = 'black'; // Black is the area to be preserved
    maskCtx.fillRect(drawX, drawY, originalImage.naturalWidth, originalImage.naturalHeight);
    const maskImagePart = dataUrlToPart(maskCanvas.toDataURL('image/png'));
    
    // Step 2: Use the generated prompt to create the final instruction set.
    const finalPrompt = generateAdaptImagePrompt(customSceneDescription);
    const textPart = { text: finalPrompt };

    // Send the single composite image, mask, and dynamic prompt to the API
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [compositeImagePart, maskImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response);
};


/**
 * Creates a single 1:1 square image sheet by arranging multiple images in a grid.
 * This provides the model with a square input to guide a square output.
 * @param imageUrls An array of data URLs for the images.
 * @returns A promise that resolves to a data URL for the combined image sheet.
 */
export const createImageSheet = async (imageUrls: string[]): Promise<string> => {
    const images = await Promise.all(imageUrls.map(url => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }));

    if (images.length === 0) {
        throw new Error("No images to create a sheet from.");
    }

    const TARGET_DIMENSION = 1080; // The required square dimension for the model input.
    const PADDING = 24; // Padding between images

    const canvas = document.createElement('canvas');
    canvas.width = TARGET_DIMENSION;
    canvas.height = TARGET_DIMENSION;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const numImages = images.length;
    // Determine grid size (e.g., 4 images -> 2x2, 5 images -> 3x2)
    const cols = numImages <= 2 ? 2 : Math.ceil(Math.sqrt(numImages));
    const rows = Math.ceil(numImages / cols);

    const cellWidth = (TARGET_DIMENSION - (cols + 1) * PADDING) / cols;
    const cellHeight = (TARGET_DIMENSION - (rows + 1) * PADDING) / rows;

    images.forEach((img, index) => {
        const rowIndex = Math.floor(index / cols);
        const colIndex = index % cols;

        const cellX = PADDING + colIndex * (cellWidth + PADDING);
        const cellY = PADDING + rowIndex * (cellHeight + PADDING);

        // Scale image to fit inside the cell while maintaining aspect ratio
        const imgAspectRatio = img.naturalWidth / img.naturalHeight;
        const cellAspectRatio = cellWidth / cellHeight;

        let drawWidth, drawHeight;
        if (imgAspectRatio > cellAspectRatio) {
            drawWidth = cellWidth;
            drawHeight = cellWidth / imgAspectRatio;
        } else {
            drawHeight = cellHeight;
            drawWidth = cellHeight * imgAspectRatio;
        }

        // Center the image within its cell
        const drawX = cellX + (cellWidth - drawWidth) / 2;
        const drawY = cellY + (cellHeight - drawHeight) / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    });

    return canvas.toDataURL('image/png');
};


/**
 * Combines a product image and context images into a single sheet, then sends it to the Gemini API.
 * @param productImageUrl The data URL of the product image.
 * @param contextImageUrls An array of data URLs for the context images.
 * @param userPrompt The user's instructions for the composition.
 * @returns A promise that resolves to a data URL for the new composite image.
 */
export const composeImages = async (productImageUrl: string, contextImageUrls: string[], userPrompt: string): Promise<string> => {
    const validContextUrls = contextImageUrls.filter(url => url);
    if (validContextUrls.length === 0) {
        throw new Error("At least one context image is required for composition.");
    }

    const masterImagePart = dataUrlToPart(productImageUrl);

    // Create a single image sheet for all context images to simplify the model's input.
    const contextSheetUrl = await createImageSheet(validContextUrls);
    const contextSheetPart = dataUrlToPart(contextSheetUrl);

    // The model will now always receive exactly two images.
    const imageParts = [masterImagePart, contextSheetPart];
    
    // The new prompt is designed to handle this two-image structure.
    const prompt = generateComposePrompt(userPrompt);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...imageParts, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response);
};

/**
 * Sends an original image, a mask image, and a prompt to perform an inpainting edit.
 * @param originalImageUrl The data URL of the original image.
 * @param maskImageUrl The data URL of the mask image (where to edit).
 * @param userPrompt The user's instructions for the edit.
 * @returns A promise that resolves to a data URL for the new edited image.
 */
export const magicEditImage = async (originalImageUrl: string, maskImageUrl: string, userPrompt: string): Promise<string> => {
    const originalImagePart = dataUrlToPart(originalImageUrl);
    const maskImagePart = dataUrlToPart(maskImageUrl);
    const prompt = generateMagicEditPrompt(userPrompt);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, maskImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response);
};

const generateIdeas = async (imageUrl: string | null, prompt: string): Promise<string[]> => {
    const contents: {parts: ApiPart[]} = { parts: [] };
    if (imageUrl) {
        contents.parts.push(dataUrlToPart(imageUrl));
    }
    contents.parts.push({ text: prompt } as any); // Type assertion for text part

    const response = await ai.models.generateContent({
        // FIX: Updated deprecated model 'gemini-2.5-pro' to 'gemini-2.5-flash' as per guidelines.
        model: 'gemini-2.5-flash',
        contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    ideas: {
                        type: Type.ARRAY,
                        description: 'A list of 3 creative idea strings.',
                        items: {
                            type: Type.STRING
                        }
                    }
                },
                required: ['ideas']
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        if (parsed.ideas && Array.isArray(parsed.ideas)) {
            return parsed.ideas.slice(0, 3);
        }
        throw new Error("Invalid JSON structure in response: 'ideas' array not found.");
    } catch (e) {
        console.error("Failed to parse ideas JSON:", e);
        throw new Error("Could not generate ideas. The AI returned an unexpected format.");
    }
};

export const generateSceneIdeas = (imageUrl: string): Promise<string[]> => generateIdeas(imageUrl, SCENE_IDEAS_PROMPT);
export const generateComposeIdeas = (imageUrl: string): Promise<string[]> => generateIdeas(imageUrl, COMPOSE_IDEAS_PROMPT);

export const generateComposeIdeasFromSheet = (sheetUrl: string): Promise<string[]> => {
    return generateIdeas(sheetUrl, COMPOSE_IDEAS_WITH_CONTEXT_PROMPT);
};


export const generateMaskedMagicEditIdeas = async (hintImageUrl: string): Promise<string[]> => {
    const hintImagePart = dataUrlToPart(hintImageUrl);
    const promptPart = { text: MAGIC_EDIT_MASKED_IDEAS_PROMPT };

    const response = await ai.models.generateContent({
        // FIX: Updated deprecated model 'gemini-2.5-pro' to 'gemini-2.5-flash' as per guidelines.
        model: 'gemini-2.5-flash',
        contents: { parts: [hintImagePart, promptPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    ideas: {
                        type: Type.ARRAY,
                        description: 'A list of 3 creative idea strings.',
                        items: {
                            type: Type.STRING
                        }
                    }
                },
                required: ['ideas']
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        if (parsed.ideas && Array.isArray(parsed.ideas)) {
            return parsed.ideas.slice(0, 3);
        }
        throw new Error("Invalid JSON structure in response: 'ideas' array not found.");
    } catch (e) {
        console.error("Failed to parse ideas JSON:", e);
        throw new Error("Could not generate ideas. The AI returned an unexpected format.");
    }
};

export const improveMagicEditPrompt = async (hintImageUrl: string, userPrompt: string): Promise<string> => {
    const hintImagePart = dataUrlToPart(hintImageUrl);
    const prompt = MAGIC_EDIT_IMPROVE_PROMPT_PROMPT.replace('{USER_PROMPT}', userPrompt);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [hintImagePart, textPart] },
    });
    
    const improvedPrompt = response.text.trim();
    if (!improvedPrompt) {
        throw new Error("The AI returned an empty response for the prompt improvement.");
    }
    return improvedPrompt;
};

/**
 * Sends a user's prompt to the Gemini API to be improved.
 * @param userPrompt The user's text prompt.
 * @returns A promise that resolves to the improved prompt string.
 */
export const improvePrompt = async (userPrompt: string): Promise<string> => {
    const prompt = IMPROVE_PROMPT_PROMPT.replace('{USER_PROMPT}', userPrompt);

    const response = await ai.models.generateContent({
        // FIX: Updated deprecated model 'gemini-2.5-pro' to 'gemini-2.5-flash' as per guidelines.
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    const improvedPrompt = response.text.trim();
    if (!improvedPrompt) {
        throw new Error("The AI returned an empty response for the prompt improvement.");
    }
    return improvedPrompt;
};

export const improveComposePromptFromSheet = async (sheetUrl: string, userPrompt: string): Promise<string> => {
    const sheetPart = dataUrlToPart(sheetUrl);
    const prompt = IMPROVE_COMPOSE_PROMPT_PROMPT.replace('{USER_PROMPT}', userPrompt);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [sheetPart, textPart] },
    });
    
    const improvedPrompt = response.text.trim();
    if (!improvedPrompt) {
        throw new Error("The AI returned an empty response for the prompt improvement.");
    }
    return improvedPrompt;
};

/**
 * Generates an image from a text prompt.
 * @param prompt The user's text prompt.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        // FIX: Updated deprecated image generation model to 'imagen-4.0-generate-001' as per guidelines.
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Image generation failed, no image bytes returned.");
    }

    return `data:image/png;base64,${base64ImageBytes}`;
};

export const generateCampaignPrompts = async (
  masterImageUrl: string, 
  brandDescription: string, 
  campaignGoals: string, 
  numberOfPrompts: number
): Promise<string[]> => {
  const imagePart = dataUrlToPart(masterImageUrl);
  let prompt = GENERATE_CAMPAIGN_PROMPTS_PROMPT
    .replace('{BRAND_DESCRIPTION}', brandDescription)
    .replace('{CAMPAIGN_GOALS}', campaignGoals)
    // FIX: Replaced `replaceAll` with `replace` using a global regular expression for compatibility with older TypeScript targets.
    .replace(/{NUMBER_OF_PROMPTS}/g, String(numberOfPrompts));

  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  prompts: {
                      type: Type.ARRAY,
                      description: `A list of ${numberOfPrompts} creative prompt strings.`,
                      items: {
                          type: Type.STRING
                      }
                  }
              },
              required: ['prompts']
          }
      }
  });

  try {
      const jsonText = response.text.trim();
      const parsed = JSON.parse(jsonText);
      if (parsed.prompts && Array.isArray(parsed.prompts)) {
          return parsed.prompts;
      }
      throw new Error("Invalid JSON structure in response: 'prompts' array not found.");
  } catch (e) {
      console.error("Failed to parse campaign prompts JSON:", e);
      throw new Error("Could not generate campaign ideas. The AI returned an unexpected format.");
  }
};

/**
 * Generates social media content using news context from DeepAgent
 * @param newsContext News content context from DeepAgent
 * @param contentType Type of content to generate
 * @param platform Target social media platform
 * @param imageUrl Optional image to include
 * @returns Generated social media content
 */
export const generateContentWithNewsContext = async (
  newsContext: string,
  contentType: 'social_post' | 'article' | 'campaign',
  platform?: string,
  imageUrl?: string
): Promise<string> => {
  let prompt = `Based on the following news context, generate ${contentType} content`;

  if (platform) {
    prompt += ` for ${platform}`;
  }

  prompt += `:\n\n${newsContext}\n\nGenerate engaging, relevant content that incorporates the key insights from the news. Make it shareable and optimized for social media engagement.`;

  const parts: any[] = [{ text: prompt }];

  if (imageUrl) {
    parts.unshift(dataUrlToPart(imageUrl));
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
  });

  const generatedContent = response.text.trim();
  if (!generatedContent) {
    throw new Error("Failed to generate content with news context");
  }

  return generatedContent;
};

/**
 * Generates multiple social media posts for different platforms using news context
 * @param newsContext News content context from DeepAgent
 * @param platforms Array of target platforms
 * @param imageUrl Optional image to include
 * @returns Object with platform-specific content
 */
export const generateMultiPlatformContent = async (
  newsContext: string,
  platforms: string[],
  imageUrl?: string
): Promise<Record<string, string>> => {
  const prompt = `Based on the following news context, generate social media posts optimized for each of these platforms: ${platforms.join(', ')}.

News Context:
${newsContext}

For each platform, create content that:
- Incorporates key insights from the news
- Uses platform-appropriate tone and format
- Includes relevant hashtags
- Is optimized for engagement

Return the content in JSON format with platform names as keys.`;

  const parts: any[] = [{ text: prompt }];

  if (imageUrl) {
    parts.unshift(dataUrlToPart(imageUrl));
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: platforms.reduce((acc, platform) => ({
          ...acc,
          [platform]: { type: Type.STRING }
        }), {}),
        required: platforms
      }
    }
  });

  try {
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (e) {
    console.error("Failed to parse multi-platform content JSON:", e);
    throw new Error("Could not generate multi-platform content. The AI returned an unexpected format.");
  }
};

/**
 * Generates a visual prompt from news content for image creation
 * @param title News article title
 * @param summary News article summary
 * @param keyPoints Key points from the article
 * @param sentiment Article sentiment (positive, negative, neutral)
 * @returns Optimized visual prompt for image generation
 */
export const generateVisualPromptFromNews = async (
  title: string,
  summary: string,
  keyPoints: string[],
  sentiment: string = 'neutral'
): Promise<string> => {
  const prompt = `Create a compelling visual prompt for generating an image that represents this news story:

Title: ${title}
Summary: ${summary}
Key Points: ${keyPoints.join(', ')}
Sentiment: ${sentiment}

Generate a detailed visual description that would create an engaging, professional image for social media. The image should:
- Be visually striking and professional
- Represent the core concept of the news story
- Be suitable for social media sharing
- Match the sentiment of the story
- Include modern, tech-forward visual elements if relevant
- Avoid text overlays (text will be added separately)

Return only the visual prompt description, nothing else.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
  });

  const visualPrompt = response.text.trim();
  if (!visualPrompt) {
    throw new Error("Failed to generate visual prompt from news content");
  }

  return visualPrompt;
};

/**
 * Generates an image for news content using Gemini Imagen
 * @param title News article title
 * @param summary News article summary
 * @param keyPoints Key points from the article
 * @param sentiment Article sentiment
 * @param aspectRatio Desired aspect ratio for the image
 * @returns Generated image as data URL
 */
export const generateNewsContentImage = async (
  title: string,
  summary: string,
  keyPoints: string[] = [],
  sentiment: string = 'neutral',
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:5' = '1:1'
): Promise<string> => {
  // First, generate a visual prompt from the news content
  const visualPrompt = await generateVisualPromptFromNews(title, summary, keyPoints, sentiment);

  // Enhance the prompt with aspect ratio considerations
  let enhancedPrompt = visualPrompt;

  if (aspectRatio === '9:16') {
    enhancedPrompt += " Composed for vertical/portrait format, suitable for mobile viewing and stories.";
  } else if (aspectRatio === '16:9') {
    enhancedPrompt += " Composed for horizontal/landscape format, suitable for wide displays and banners.";
  } else if (aspectRatio === '4:5') {
    enhancedPrompt += " Composed for portrait format, optimized for social media posts.";
  } else {
    enhancedPrompt += " Composed for square format, perfect for social media profile and feed posts.";
  }

  // Generate the image using Imagen
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: enhancedPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: aspectRatio,
    },
  });

  const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!base64ImageBytes) {
    throw new Error("News image generation failed, no image bytes returned.");
  }

  return `data:image/png;base64,${base64ImageBytes}`;
};

/**
 * Generates multiple platform-optimized images for news content
 * @param title News article title
 * @param summary News article summary
 * @param keyPoints Key points from the article
 * @param sentiment Article sentiment
 * @param platforms Array of platforms to generate images for
 * @returns Object with platform-specific images
 */
export const generatePlatformOptimizedNewsImages = async (
  title: string,
  summary: string,
  keyPoints: string[] = [],
  sentiment: string = 'neutral',
  platforms: string[] = ['instagram', 'twitter', 'linkedin', 'facebook']
): Promise<Record<string, string>> => {
  const platformAspectRatios: Record<string, '1:1' | '9:16' | '16:9' | '4:5'> = {
    instagram: '1:1',
    twitter: '16:9',
    linkedin: '4:5',
    facebook: '16:9',
    story: '9:16',
    reel: '9:16'
  };

  const images: Record<string, string> = {};

  // Generate images for each platform concurrently for better performance
  const imagePromises = platforms.map(async (platform) => {
    const aspectRatio = platformAspectRatios[platform] || '1:1';
    try {
      const imageUrl = await generateNewsContentImage(
        title,
        summary,
        keyPoints,
        sentiment,
        aspectRatio
      );
      return { platform, imageUrl };
    } catch (error) {
      console.error(`Failed to generate image for ${platform}:`, error);
      return { platform, imageUrl: null };
    }
  });

  const results = await Promise.all(imagePromises);

  results.forEach(({ platform, imageUrl }) => {
    if (imageUrl) {
      images[platform] = imageUrl;
    }
  });

  return images;
};

/**
 * Generates email content using news context and brand information
 * @param newsContext News content context from article or DeepAgent
 * @param emailType Type of email to generate
 * @param brandContext Brand configuration for consistent messaging
 * @param recipientContext Target audience information
 * @returns Generated email content
 */
export const generateEmailContent = async (
  newsContext: string,
  emailType: 'newsletter' | 'promotional' | 'transactional' | 'announcement',
  brandContext?: {
    brandName: string;
    brandVoice: string;
    brandDescription: string;
    targetAudience: string;
    keyMessages: string[];
  },
  recipientContext?: {
    segmentName: string;
    interests: string[];
    previousEngagement: string;
  }
): Promise<{
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  callToAction: { text: string; url: string };
}> => {
  let prompt = `Generate a professional ${emailType} email based on this news context:\n\n${newsContext}\n\n`;

  // Add brand context
  if (brandContext) {
    prompt += `Brand Information:
- Brand Name: ${brandContext.brandName}
- Brand Voice: ${brandContext.brandVoice}
- Brand Description: ${brandContext.brandDescription}
- Target Audience: ${brandContext.targetAudience}
- Key Messages: ${brandContext.keyMessages.join(', ')}

`;
  }

  // Add recipient context
  if (recipientContext) {
    prompt += `Recipient Context:
- Segment: ${recipientContext.segmentName}
- Interests: ${recipientContext.interests.join(', ')}
- Previous Engagement: ${recipientContext.previousEngagement}

`;
  }

  // Email type specific instructions
  const emailInstructions = {
    newsletter: 'Create an informative newsletter email that updates subscribers on recent developments. Include multiple sections, relevant insights, and actionable takeaways.',
    promotional: 'Create a compelling promotional email that drives action while providing value. Focus on benefits and include a strong call-to-action.',
    transactional: 'Create a clear, concise transactional email that provides necessary information and maintains a professional tone.',
    announcement: 'Create an engaging announcement email that generates excitement and clearly communicates the news.'
  };

  prompt += emailInstructions[emailType];

  prompt += `

Please provide the email content in JSON format with these fields:
- subject: Compelling subject line (50-60 characters)
- preheader: Preview text (90-130 characters)
- bodyHtml: Full HTML email body with proper formatting, headings, and structure
- bodyText: Plain text version of the email
- callToAction: Object with 'text' and 'url' properties for the main CTA

The email should be:
- Mobile-responsive and well-formatted
- Engaging and aligned with the brand voice
- Include relevant news insights
- Have a clear call-to-action
- Be appropriate for the target audience`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          preheader: { type: Type.STRING },
          bodyHtml: { type: Type.STRING },
          bodyText: { type: Type.STRING },
          callToAction: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              url: { type: Type.STRING }
            },
            required: ['text', 'url']
          }
        },
        required: ['subject', 'preheader', 'bodyHtml', 'bodyText', 'callToAction']
      }
    }
  });

  try {
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (e) {
    console.error("Failed to parse email content JSON:", e);
    throw new Error("Could not generate email content. The AI returned an unexpected format.");
  }
};

/**
 * Generates multiple email variations for A/B testing
 * @param newsContext News content context
 * @param emailType Type of email
 * @param brandContext Brand information
 * @param variationCount Number of variations to generate
 * @returns Array of email variations
 */
export const generateEmailVariations = async (
  newsContext: string,
  emailType: 'newsletter' | 'promotional' | 'transactional' | 'announcement',
  brandContext?: {
    brandName: string;
    brandVoice: string;
    brandDescription: string;
    targetAudience: string;
    keyMessages: string[];
  },
  variationCount: number = 3
): Promise<Array<{
  id: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  callToAction: { text: string; url: string };
  variation: string;
}>> => {
  const variations = [];

  const variationStyles = [
    { name: 'Direct', description: 'Straightforward and to-the-point messaging' },
    { name: 'Engaging', description: 'More conversational and engaging tone' },
    { name: 'Professional', description: 'Formal and authoritative approach' },
    { name: 'Story-driven', description: 'Narrative-focused with storytelling elements' },
    { name: 'Data-focused', description: 'Emphasizes facts, numbers, and insights' }
  ];

  for (let i = 0; i < Math.min(variationCount, variationStyles.length); i++) {
    const style = variationStyles[i];

    try {
      const basePrompt = `Generate a ${style.description} ${emailType} email based on this news context:\n\n${newsContext}\n\n`;

      let prompt = basePrompt;

      // Add brand context
      if (brandContext) {
        prompt += `Brand Information:
- Brand Name: ${brandContext.brandName}
- Brand Voice: ${brandContext.brandVoice} (adapted for ${style.name} style)
- Brand Description: ${brandContext.brandDescription}
- Target Audience: ${brandContext.targetAudience}
- Key Messages: ${brandContext.keyMessages.join(', ')}

`;
      }

      prompt += `Style: ${style.description}

Create the email content in JSON format with subject, preheader, bodyHtml, bodyText, and callToAction fields.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              preheader: { type: Type.STRING },
              bodyHtml: { type: Type.STRING },
              bodyText: { type: Type.STRING },
              callToAction: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ['text', 'url']
              }
            },
            required: ['subject', 'preheader', 'bodyHtml', 'bodyText', 'callToAction']
          }
        }
      });

      const jsonText = response.text.trim();
      const parsed = JSON.parse(jsonText);

      variations.push({
        id: `variation-${i + 1}`,
        ...parsed,
        variation: style.name
      });
    } catch (error) {
      console.error(`Failed to generate ${style.name} email variation:`, error);
    }
  }

  return variations;
};

/**
 * Optimizes email subject lines for better open rates
 * @param originalSubject Original subject line
 * @param newsContext News content context
 * @param brandContext Brand information
 * @param targetMetrics Optimization goals
 * @returns Array of optimized subject lines
 */
export const optimizeEmailSubjectLines = async (
  originalSubject: string,
  newsContext: string,
  brandContext?: {
    brandName: string;
    brandVoice: string;
    targetAudience: string;
  },
  targetMetrics?: {
    prioritizeOpenRate: boolean;
    prioritizeClickRate: boolean;
    includePersonalization: boolean;
    includeUrgency: boolean;
    includeNumbers: boolean;
  }
): Promise<string[]> => {
  let prompt = `Optimize this email subject line for better performance:\n\nOriginal: "${originalSubject}"\n\nNews Context: ${newsContext}\n\n`;

  if (brandContext) {
    prompt += `Brand Context:
- Brand Name: ${brandContext.brandName}
- Brand Voice: ${brandContext.brandVoice}
- Target Audience: ${brandContext.targetAudience}\n\n`;
  }

  if (targetMetrics) {
    prompt += `Optimization Goals:
- Prioritize Open Rate: ${targetMetrics.prioritizeOpenRate}
- Prioritize Click Rate: ${targetMetrics.prioritizeClickRate}
- Include Personalization: ${targetMetrics.includePersonalization}
- Include Urgency: ${targetMetrics.includeUrgency}
- Include Numbers/Data: ${targetMetrics.includeNumbers}\n\n`;
  }

  prompt += `Generate 5 optimized subject line variations that:
- Are 50-60 characters or less
- Create curiosity and drive opens
- Are relevant to the news content
- Match the brand voice
- Follow email marketing best practices

Return as a JSON array of strings.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjects: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ['subjects']
      }
    }
  });

  try {
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    return parsed.subjects || [];
  } catch (e) {
    console.error("Failed to parse subject line optimizations:", e);
    throw new Error("Could not optimize subject lines. The AI returned an unexpected format.");
  }
};