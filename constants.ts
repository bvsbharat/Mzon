// FIX: Added PRESET_PROMPTS object for background options.
export const PRESET_PROMPTS: Record<string, string> = {
  'Black Reflective': 'a dramatic product shot on a glossy black reflective surface, creating elegant reflections. Use key lighting to highlight the product\'s form.',
  'Wooden Surface': 'a rustic and natural product shot on a weathered wooden surface. The scene should be warm and inviting, with soft, natural light coming from the side.',
  'Marble Slab': 'an elegant and luxurious product shot on a white and gray marble slab. The lighting should be bright and clean, enhancing the high-end feel.',
  'Concrete': 'a modern, industrial-style product shot on a raw concrete surface. Use hard light to create defined shadows and textures.',
  'Outdoor Nature': 'a product shot in a natural outdoor setting, like on a mossy rock in a forest or on sand at a beach during golden hour. The product should look like it belongs in the scene.',
  'Floating': 'a creative shot where the product is floating in mid-air against a simple, solid-colored background. The scene should have a sense of weightlessness and magic.',
  'Gradient Backdrop': "The product is set against a smooth, seamless backdrop with a subtle, modern color gradient (e.g., from light blue to soft pink). The lighting should be clean and professional, making the product pop.",
  'Textured Fabric': "A premium product shot on a rich, textured fabric like velvet, silk, or linen. The fabric should be draped elegantly, and the lighting should catch its texture, adding a tactile and luxurious feel."
};

// FIX: Added COMMERCIAL_TEMPLATES object for background options.
export const COMMERCIAL_TEMPLATES: Record<string, string> = {
  'What\'s in the Box': `Art Direction: A top-down "flat lay" photograph in the knolling style. The product, its minimalist packaging, and any relevant accessories are arranged neatly in a grid-like fashion on a clean, neutral background. The lighting is perfectly even and shadowless.`,
  'Macro Detail': `Art Direction: An extreme macro photograph focusing on a key material texture or detail of the product. Use a razor-thin depth of field to isolate the detail, with the rest of the product softly blurred into the background. The lighting and finish must perfectly match the original master image.`,
  'Lifestyle Action': `Art Direction: A dynamic, photorealistic lifestyle action shot capturing a candid moment. The product is shown in a relevant real-world scene during its use. The composition should have a sense of motion and energy, with natural lighting that fits the environment perfectly.`,
  'UGC Style': `Art Direction: A realistic, user-generated content (UGC) style photo. The shot is from an authentic, casual first-person perspective (looking down). The lighting should feel natural and slightly imperfect, like a photo taken on a high-end smartphone on a sunny day.`,
  'Ad Banner': `Art Direction: A professional, minimalist photograph designed for a website banner with ample copy space. Position the product in the bottom-left third of the frame on a clean, light grey background. The right two-thirds of the image should be empty, clean negative space. Landscape orientation.`,
  'Product Showcase': `Art Direction: A clean, direct product showcase. The product is centered and elevated on a simple, geometric pedestal (e.g., a cylinder or cube) made of a neutral material like white plaster or light grey stone. The background is a solid, complementary color with soft, studio lighting that creates a gentle shadow, emphasizing the product's form.`,
  'Magazine Ad': 'Create a full-page magazine advertisement featuring the product. The style should be bold and eye-catching, with space for headline text at the top and copy at the bottom. The background should be dynamic and related to the product\'s use case.',
  'Social Media Post': 'Generate an image for a social media post (Instagram, Facebook). The product should be the central focus, styled in a flat lay or with relevant props. The composition should be square (1:1 aspect ratio) and visually appealing.'
};

// This type is defined here to avoid a circular dependency with geminiService.ts
type BackgroundConfig = 
  { type: 'preset'; value: string; } | 
  { type: 'ai'; value: string; } |
  { type: 'commercial'; value: string; };

// FIX: Added generateDynamicPrompt function to create prompts for pro shots.
export const generateDynamicPrompt = (backgroundConfig: BackgroundConfig): string => {
  const basePrompt = `Generate a photorealistic, professional product shot of the subject. The final image should be clean, high-resolution, and suitable for e-commerce or advertising.`;
  
  let backgroundInstruction = '';
  switch (backgroundConfig.type) {
    case 'preset':
      backgroundInstruction = `The background should be: ${PRESET_PROMPTS[backgroundConfig.value] || 'a clean white studio background'}.`;
      break;
    case 'commercial':
      backgroundInstruction = `Follow this commercial template: ${COMMERCIAL_TEMPLATES[backgroundConfig.value] || 'create a standard social media post'}.`;
      break;
    case 'ai':
      if (backgroundConfig.value) {
        backgroundInstruction = `The user has described the scene as: "${backgroundConfig.value}". Interpret this creatively and professionally.`;
      } else {
        backgroundInstruction = `The background should be: a clean white studio background.`;
      }
      break;
  }
  
  return `${basePrompt} ${backgroundInstruction} The product should be perfectly lit, in sharp focus, and centered in the composition. Remove any unwanted background from the original image and seamlessly integrate the product into the new scene.`;
};

// FIX: Added generateVariationPrompt function to create prompts for variations.
export const generateVariationPrompt = (backgroundConfig: BackgroundConfig): string => {
  const basePrompt = `Using the provided master product shot, generate a new variation of the scene. Keep the product itself identical—do not change its color, shape, or details. Only change the background and environment based on the following instructions.`;
  
  let backgroundInstruction = '';
  switch (backgroundConfig.type) {
    case 'preset':
      backgroundInstruction = `The new background should be: ${PRESET_PROMPTS[backgroundConfig.value] || 'a clean white studio background'}.`;
      break;
    case 'commercial':
      backgroundInstruction = `Recreate the scene using this commercial template: ${COMMERCIAL_TEMPLATES[backgroundConfig.value] || 'create a standard social media post'}.`;
      break;
    case 'ai':
      if (backgroundConfig.value) {
        backgroundInstruction = `The user has described the new scene as: "${backgroundConfig.value}". Interpret this creatively while preserving the original product.`;
      } else {
        backgroundInstruction = `The new background should be: a clean white studio background.`;
      }
      break;
  }
  
  return `${basePrompt} ${backgroundInstruction} The integration should be seamless, with realistic lighting and shadows that match the new environment.`;
};

// FIX: Added generateComposePrompt function to create prompts for image composition.
export const generateComposePrompt = (userPrompt: string): string => {
  return `You are an expert AI image editor specializing in photorealistic compositions. Your task is to create a single, perfect image based on a user's prompt and two input images.

**Input Images:**
You have been provided with exactly two images:
   - **Image 1 (The Product):** This is the primary product/object that must be featured in the final scene.
   - **Image 2 (The Context Sheet):** This image is a collage containing one or more context items (e.g., models, backgrounds, props). You must extract the necessary elements from this sheet to build the scene.

**User's Instructions:**
"${userPrompt}"

**Your Goal:**
Follow the user's instructions precisely. Use **Image 1** as the main subject and use elements from **Image 2** to construct the final, seamless, photorealistic scene.

**Execution Scenarios:**
-   **Arrangement:** If the user asks to arrange items, take the product from **Image 1** and the required items from the context sheet in **Image 2** and place them into a new scene according to the instructions.
-   **Replacement/Editing:** If the user asks to replace an object from the context sheet with the product from Image 1 (e.g., "make the model hold the perfume"), you must perform this edit flawlessly.

**ABSOLUTE CRITICAL RULES - NON-NEGOTIABLE:**
1.  **OUTPUT A SINGLE IMAGE:** You MUST return ONLY ONE final, composed image.
2.  **DO NOT INCLUDE SOURCE IMAGES:** Your output must NOT contain the original **Image 1** (the product) or **Image 2** (the context sheet). The user wants to see ONLY the final result, not the ingredients.
3.  **MAINTAIN 1:1 ASPECT RATIO:** The final image must be a 1080x1080 square.
4.  **NO TEXT OR ARTIFACTS:** Do not add any text, labels, watermarks, or borders to the image.

Analyze the two images and the user's prompt, then generate the single, final, final, composed image.`;
};


// FIX: Added generateMagicEditPrompt function to create prompts for inpainting.
export const generateMagicEditPrompt = (userPrompt: string): string => {
  return `You are a sophisticated AI inpainting model. You will receive an original image and a mask image.
Your task is to intelligently modify ONLY the area indicated by the white parts of the mask, following the user's text prompt.
-   **Preserve the Unmasked Areas:** The parts of the original image corresponding to the black area of the mask must remain completely unchanged.
-   **Follow the Prompt:** Fulfill the user's request within the masked region.
-   **Seamless Integration:** The edited area must blend perfectly with the rest of the image. Match the lighting, texture, shadows, and overall style of the original photo.
-   **Maintain Photorealism:** The final result must look like a real, unedited photograph.

User's prompt for the masked area: "${userPrompt}"`;
};

// FIX: Added SCENE_IDEAS_PROMPT constant for generating scene ideas.
export const SCENE_IDEAS_PROMPT = `You are an expert creative director for product photography.
Based on the provided product image, generate 3 distinct and creative scene ideas for a new product shot.
Each idea should be a short, descriptive phrase that could be used as a prompt.
Focus on ideas that are visually interesting and highlight the product.

Examples:
- "On a rustic wooden table next to a steaming cup of coffee."
- "Floating weightlessly in a minimalist, pastel-colored space."
- "On a mossy rock in a misty, enchanted forest."

Generate 3 ideas for the product in the image.`;

// FIX: Added IMPROVE_PROMPT_PROMPT constant for the generic prompt enhancer.
export const IMPROVE_PROMPT_PROMPT = `You are an expert AI prompt engineer. Your task is to rewrite a user's prompt to be more descriptive and effective for a text-to-image AI model.
Take the user's simple idea and expand it with details about style, lighting, composition, and quality to generate a more photorealistic and visually stunning image.

User's prompt: "{USER_PROMPT}"

Rewrite it. Return ONLY the improved prompt.`;

// FIX: Added COMPOSE_IDEAS_PROMPT constant for generating composition ideas.
export const COMPOSE_IDEAS_PROMPT = `You are an expert creative director specializing in 'Shop the Look' compositions.
Based on the provided product image, generate 3 creative ideas for items to compose with it.
Each idea should be a short, descriptive phrase that could be used as a prompt to describe the final scene.
Think about what other products, props, or settings would complement the main item.

Example for a watch:
- "Styled on a wrist, with a crisp white shirt cuff and a leather-bound book in the background."
- "Arranged neatly on a wooden valet tray with a pair of sunglasses and a set of keys."
- "On a city map next to a compass, suggesting travel and adventure."

Generate 3 composition ideas for the product in the image.`;

// FIX: Added COMPOSE_IDEAS_WITH_CONTEXT_PROMPT for generating ideas from an image sheet.
export const COMPOSE_IDEAS_WITH_CONTEXT_PROMPT = `You are an expert creative director for 'Shop the Look' photography.
You are given a single image sheet containing multiple items.
Your task is to generate 3 distinct ideas for how to arrange these items into a single, cohesive, photorealistic scene.
Each idea should be a short, descriptive prompt that describes the final composition.

Example for a sheet with a handbag, sunglasses, and a scarf:
- "A flat lay of the items on a white marble surface, artfully arranged."
- "The handbag sitting on a cafe table, with the sunglasses and scarf casually placed next to it."
- "The items displayed on a rustic wooden shelf with soft, natural lighting."

Generate 3 composition ideas for the items shown in the image sheet.`;

// FIX: Added IMPROVE_COMPOSE_PROMPT_PROMPT for improving composition prompts.
export const IMPROVE_COMPOSE_PROMPT_PROMPT = `You are a elite-level AI prompt engineer with the mind of a professional art director.
Your mission is to transform a user's simple idea into a masterpiece-level prompt for an AI image composition model.

**Input:**
1.  An image sheet displaying several products.
2.  A user's basic prompt: "{USER_PROMPT}"

**Your Process:**
1.  **Analyze the Assets:** Carefully examine the items on the image sheet. Note their style, material, and potential use case (e.g., luxury watch, casual sneakers, tech gadget).
2.  **Elevate the Concept:** Take the user's core idea and flesh it out. Your rewritten prompt must be rich, descriptive, and specific.
3.  **Inject Rich Detail:** Expand on the user's prompt by adding specific, evocative details about:
    -   **Scene & Setting:** Describe the environment. Is it a minimalist concrete loft, a rustic wooden cabin, or a sun-drenched beach cafe? Be specific about surfaces ("on a polished white marble countertop," "nestled in soft, white sand").
    -   **Arrangement:** Dictate the composition. Use terms like "an artful flat lay," "casually scattered as if in use," "a dynamic, gravity-defying arrangement."
    -   **Lighting:** Define the light source and quality. "Soft, diffused morning light streaming from a large window to the left," "dramatic, high-contrast studio lighting creating long shadows," "warm, golden hour sunlight."
    -   **Atmosphere & Mood:** What feeling should the image evoke? "A sense of quiet luxury and sophistication," "a vibrant, energetic and youthful mood," "a calm, serene, and natural atmosphere."
    -   **Photography Style:** Specify the camera details. "A professional photograph, shot on a DSLR with a 50mm lens, eye-level perspective, shallow depth of field," "a clean, top-down shot."

**Output Rules:**
-   Return **ONLY** the final, enhanced prompt text.
-   Do not add any explanations or introductory phrases like "Here is the improved prompt:".
-   The final prompt must be a single, cohesive paragraph.

User's prompt: "{USER_PROMPT}"

Now, perform your magic.`;

// FIX: Added MAGIC_EDIT_MASKED_IDEAS_PROMPT for generating ideas for masked edits.
export const MAGIC_EDIT_MASKED_IDEAS_PROMPT = `You are an expert AI photo editor. You will be given a single "Hint Image" with a specific area highlighted in green.
Your task is to analyze the object under the green highlight and suggest 3 creative and subtle edits that could be performed there.
Each suggestion should be a short, actionable phrase that could be used as a prompt.
The ideas should aim to enhance the photo, not drastically change it.

Example for a t-shirt highlighted in green:
- "Change the color of the t-shirt to a deep navy blue."
- "Add a small, minimalist mountain logo to the chest."
- "Change the fabric texture to a soft, heathered cotton."

Generate 3 edit ideas for the highlighted area of the provided image.`;


export const MAGIC_EDIT_IMPROVE_PROMPT_PROMPT = `You are a hyper-specialized AI prompt engineer for photorealistic inpainting. Your primary goal is to enhance a user's prompt to achieve a subtle, believable edit while preserving the identity of the original object.

You will receive:
1. A "Hint Image" showing an original photo with a specific area highlighted in green.
2. A "User's Prompt" describing the desired modification.

**Your Meticulous Process:**
1.  **Precise Identification:** Scrutinize the green highlighted area in the Hint Image. Identify the object with extreme specificity. Do not generalize. For example, if it's a cap with a logo, identify it as "the Jordan brand baseball cap," not just "a cap." Note its material, texture, and any unique identifiers.
2.  **Deconstruct User Intent:** Analyze the User's Prompt to understand the exact modification they want. This is the *only* change you should describe.
3.  **Contextual Analysis:** Observe the lighting, shadows, and textures immediately surrounding the highlighted object to ensure the final edit will be seamless.
4.  **Synthesize the Preservation-Focused Prompt:** Rewrite the user's prompt with the following strict rules:
    a.   **Explicitly preserve the object's core identity.** Your prompt should guide the AI to *modify* the existing object, not replace it. Mention the specific object identified in Step 1.
    b.   **Integrate the user's modification.** Clearly state the change from Step 2.
    c.   **Add contextual details.** Weave in the lighting, shadow, and material details from Step 3 to ensure a photorealistic blend.
    d.   **DO NOT add or invent new objects or change fundamental characteristics (like logos or shape) unless the user explicitly asks for it.**

**Example:**
-   **Hint Image:** A man wearing a black cap with a white Jordan logo. The cap is highlighted.
-   **User's Prompt:** "change this to grey"
-   **Your Improved Prompt:** "Change the color of the black Jordan baseball cap to a neutral grey, carefully preserving the original fabric texture, the white logo, and matching the soft, warm outdoor lighting of the scene."

**Output Rules:**
-   Return ONLY the improved prompt text.
-   Do not include any introductory phrases like "Improved prompt:".

User's prompt: "{USER_PROMPT}"
`;

export const PROMPT_CHIPS: Record<string, string[]> = {
  'Lighting': ['Soft Light', 'Dramatic Lighting', 'Golden Hour', 'Studio Lighting', 'Rim Lighting'],
  'Style': ['Photorealistic', 'Cinematic', 'Minimalist', 'Vintage Film', 'High-Fashion'],
  'Composition': ['Close-up Shot', 'Wide Angle', 'Top-down Flat Lay', 'Rule of Thirds', 'Symmetrical'],
  'Details': ['8K', 'Ultra-detailed', 'Sharp Focus', 'Bokeh Background', 'High Resolution']
};

export const GENERATE_CAMPAIGN_PROMPTS_PROMPT = `You are an expert AI Creative Director for a high-end digital marketing agency. Your task is to generate a series of creative, diverse, and detailed image prompts for a new product campaign.

**You will be given:**
1.  **A Product Image:** The hero shot of the product.
2.  **Brand Description:** A short summary of the brand's identity (e.g., "minimalist, sustainable, and modern").
3.  **Campaign Goals:** The objective of this campaign (e.g., "drive engagement on social media for a summer launch," "create aspirational lifestyle content").
4.  **Number of Prompts:** The exact number of prompts to generate.

**Your Process:**
1.  **Analyze:** Deeply analyze all inputs. Understand the product's visual characteristics, the brand's voice, and the campaign's strategic goals.
2.  **Brainstorm Concepts:** Based on your analysis, brainstorm a variety of distinct concepts that align with the campaign. Think about different scenes, moods, lighting styles, compositions, and target audiences. Concepts should be diverse (e.g., some lifestyle, some abstract, some minimalist product shots).
3.  **Write Detailed Prompts:** For each concept, write a rich, detailed prompt suitable for a text-to-image AI model. Each prompt should be a complete instruction set for generating one image. Do not just list keywords. Describe the scene, lighting, mood, and composition. The prompt should instruct the AI to place the provided product into this new scene seamlessly.

**Inputs:**
-   **Brand Description:** "{BRAND_DESCRIPTION}"
-   **Campaign Goals:** "{CAMPAIGN_GOALS}"
-   **Number of Prompts:** {NUMBER_OF_PROMPTS}

**Output Rules:**
-   Return **ONLY** a JSON object.
-   The JSON object must have a single key: "prompts".
-   The value of "prompts" must be an array of strings.
-   The array must contain exactly {NUMBER_OF_PROMPTS} unique prompt strings.
-   Do not add any explanations or introductory text.
`;

export const GENERATE_ADAPT_PROMPT_PROMPT = `You are an expert AI Creative Director. Your task is to analyze an image and creatively describe how to extend its scene to fill a new canvas based on specific instructions.

**You will be given:**
1.  **An Image:** The source image to be extended.
2.  **Target Aspect Ratio:** The final desired shape (e.g., "9:16", "16:9").

**Your Process:**
1.  **Analyze the Image:** Deeply analyze the existing scene: the subject, the background, the lighting, and the overall mood.
2.  **Follow Placement Instructions:** {PLACEMENT_INSTRUCTION}
3.  **Write a Descriptive Prompt:** Based on your analysis and the placement instructions, write a concise but rich prompt that describes this complete, extended scene for an AI outpainting model. The prompt should be a single, clear instruction. **Important: Describe only the new areas to be generated, not the original image content.**

**Example for a 9:16 top-aligned target:**
-   **Image:** A perfume bottle on a marble countertop.
-   **Your Output:** "The white marble countertop continues downwards, showing subtle grey veining. Below the countertop, a dark, out-of-focus bathroom background is visible with a hint of a green plant."

**Inputs:**
-   **Target Aspect Ratio:** "{ASPECT_RATIO}"

**Output:**
Return ONLY the generated outpainting prompt text. Do not add any introductory phrases.`;

export const generateAdaptImagePrompt = (sceneDescription: string): string => {
  return `You are an expert AI photo editor specializing in outpainting. Your task is to seamlessly extend a photograph to fill a larger canvas based on a specific scene description.

**INPUTS:**
1.  **Composite Image:** A photograph centered on a solid, bright green canvas.
2.  **Mask Image:** A mask where the black area corresponds to the original photograph that MUST be preserved, and the white area corresponds to the green canvas that MUST be replaced.

**SCENE DESCRIPTION:**
"${sceneDescription}"

**YOUR TASK:**
Replace **every pixel** of the bright green area by photorealistically extending the background of the original photo according to the **SCENE DESCRIPTION**.

**CRITICAL RULES - NON-NEGOTIABLE:**
1.  **NO GREEN:** The final output must contain absolutely no green pixels.
2.  **SEAMLESS EXTENSION:** The new areas must be a natural continuation of the original photo's background, matching the lighting, textures, and content as described in the scene description.
3.  **PRESERVE ORIGINAL:** The area defined by the black part of the mask MUST remain 100% unchanged.

Generate a single, complete, outpainted image.`;
};