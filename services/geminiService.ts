import { GoogleGenAI, Type } from "@google/genai";
import { ATSAnalysisResult, StructuredResume } from "../types";

export const analyzeAndReviseResume = async (resumeText: string, jobDescription: string): Promise<ATSAnalysisResult> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    As an expert ATS Optimization Specialist and professional resume writer, your primary goal is to revise the provided resume to achieve an ATS match score of over 85% against the target job description. You will deconstruct the original resume and the job description, then construct a new, optimized resume within a structured JSON format.

    Current Resume:
    ---
    ${resumeText}
    ---

    Target Job Description:
    ---
    ${jobDescription}
    ---

    Follow these instructions meticulously to generate the content for the JSON fields:

    1.  **originalAtsScore & revisedAtsScore**:
        *   Calculate a score from 0-100 representing how well the resume aligns with the job description based on keywords, skills, and experience.
        *   The 'originalAtsScore' is for the provided resume.
        *   The 'revisedAtsScore' is for the resume you are creating. This score MUST be significantly higher, reflecting the goal of 85%+.

    2.  **feedback**:
        *   Provide a concise, bulleted list (using markdown like '*') of the key changes you made and why. Be specific. For example: "* Infused 'Azure DevOps' and 'CI/CD pipeline' throughout the experience section to align with core job requirements." or "* Rephrased achievements to include quantifiable metrics like 'a 25% increase in efficiency'."

    3.  **revisedResume (Structured JSON Object)**:
        *   **contact**: Parse the name, email, phone, location, and LinkedIn from the original resume. If a field is not present, omit it.
        *   **summary**: Write a concise, powerful summary (2-4 sentences) at the top, tailored to the job description and packed with relevant keywords from the JD.
        *   **skills**: Create an array of skill objects. Each object must have a 'category' (e.g., "Programming Languages", "Cloud Technologies") and a 'skills' array containing specific skills from the job description. This categorized format is crucial for readability and ATS scoring.
        *   **experience**:
            *   For each job entry from the original resume, create a corresponding object.
            *   **You MUST NOT change the employment dates (dates field) or duration for any role.** The timeline must remain exactly as in the original.
            *   Rewrite the bullet points ('achievements') to highlight quantifiable results. **Using metrics is mandatory.** If the original resume lacks metrics, infer realistic and impactful metrics (e.g., "streamlined processes, reducing deployment time by 30%").
            *   Use strong action verbs (e.g., Spearheaded, Architected, Optimized, Delivered).
            *   **Perform intelligent technology substitution**. If the resume mentions a technology (e.g., AWS, Jira) and the JD requires an equivalent (e.g., Azure, Trello), you MUST replace it in the achievements.
            *   Strategically weave keywords from the JD into the achievement descriptions.
        *   **education**: Parse the degree, institution, and graduation date for each educational entry.

    The final output MUST be a valid JSON object matching the provided schema.
    `;

    const contactSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            location: { type: Type.STRING },
        },
        required: ['name'],
    };

    const experienceSchema = {
        type: Type.OBJECT,
        properties: {
            role: { type: Type.STRING },
            company: { type: Type.STRING },
            location: { type: Type.STRING },
            dates: { type: Type.STRING },
            achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['role', 'company', 'dates', 'achievements'],
    };

    const educationSchema = {
        type: Type.OBJECT,
        properties: {
            degree: { type: Type.STRING },
            institution: { type: Type.STRING },
            location: { type: Type.STRING },
            graduationDate: { type: Type.STRING },
        },
        required: ['degree', 'institution'],
    };
    
    const skillCategorySchema = {
        type: Type.OBJECT,
        properties: {
            category: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['category', 'skills'],
    };

    const revisedResumeSchema = {
        type: Type.OBJECT,
        properties: {
            contact: contactSchema,
            summary: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: skillCategorySchema },
            experience: { type: Type.ARRAY, items: experienceSchema },
            education: { type: Type.ARRAY, items: educationSchema },
        },
        required: ['contact', 'summary', 'skills', 'experience', 'education'],
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
          originalAtsScore: { type: Type.NUMBER, description: "ATS score for the original resume (0-100)." },
          revisedAtsScore: { type: Type.NUMBER, description: "ATS score for the revised resume (0-100), aiming for 85%+." },
          feedback: { type: Type.STRING, description: "Concise feedback on the changes made, using markdown for lists (e.g., '* Point 1')." },
          revisedResume: revisedResumeSchema,
        },
        required: ['originalAtsScore', 'revisedAtsScore', 'feedback', 'revisedResume'],
      };


    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                temperature: 0.2,
                responseMimeType: 'application/json',
                responseSchema: schema,
            }
        });

        const resultText = response.text.trim();
        const resultJson = JSON.parse(resultText);
        
        // Basic validation
        if (typeof resultJson.originalAtsScore !== 'number' || typeof resultJson.revisedAtsScore !== 'number' || !resultJson.feedback || !resultJson.revisedResume) {
            throw new Error("AI response is missing required fields.");
        }

        return resultJson as ATSAnalysisResult;

    } catch (error) {
        console.error("Error calling Gemini API or parsing response:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the AI's response. The format was invalid.");
        }
        throw new Error("Failed to get analysis from the AI. The model may have returned an invalid response.");
    }
};