

import { GoogleGenAI, Type } from "@google/genai";
import { Course, Module, Assignment, Submission } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const courseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A concise and engaging title for the course." },
        description: { type: Type.STRING, description: "A 1-2 paragraph summary of what the course is about." },
        modules: {
            type: Type.ARRAY,
            description: "A list of 3 to 5 learning modules.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Title of the module." },
                    description: { type: Type.STRING, description: "A brief description of the module's content." },
                    content: { type: Type.STRING, description: "The main learning content for the module. This should be a few paragraphs of text explaining the module's topics in detail." },
                    assignments: {
                        type: Type.ARRAY,
                        description: "A list containing exactly one assignment for this module.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "Title of the assignment." },
                                prompt: { type: Type.STRING, description: "A detailed prompt for the assignment." }
                            },
                            required: ["title", "prompt"]
                        }
                    }
                },
                required: ["title", "description", "content", "assignments"]
            }
        }
    },
    required: ["title", "description", "modules"]
};


export const generateCourse = async (topic: string): Promise<Omit<Course, 'id' | 'enrolledStudentIds'>> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an expert curriculum designer for a modern Learning Management System. Create a complete, ready-to-use course structure about "${topic}". The course should be engaging and well-structured for online learning. For each module, provide a detailed 'content' section with a few paragraphs of educational material.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: courseSchema,
            },
        });

        const jsonText = response.text.trim();
        const courseData = JSON.parse(jsonText);

        const courseWithIds = {
            ...courseData,
            modules: courseData.modules.map((mod: Omit<Module, 'id'>) => ({
                ...mod,
                id: `mod-${Date.now()}-${Math.random()}`,
                assignments: mod.assignments.map((ass: Omit<Assignment, 'id'>) => ({
                    ...ass,
                    id: `ass-${Date.now()}-${Math.random()}`,
                }))
            }))
        };
        return courseWithIds;

    } catch (error) {
        console.error("Error generating course:", error);
        throw new Error("Failed to generate course content. Please check the topic and try again.");
    }
};

export const evaluateSubmission = async (assignment: Assignment, submission: Submission): Promise<{ grade: number, feedback: string }> => {
    try {
        const prompt = `You are a fair and helpful teaching assistant. Evaluate a student's submission for the following assignment.
        
        Assignment Title: "${assignment.title}"
        Assignment Prompt: "${assignment.prompt}"
        
        Student Submission:
        ---
        ${submission.content}
        ---
        
        Please provide a numerical grade out of 100 and 2-3 sentences of constructive feedback. Be encouraging but also provide specific areas for improvement if necessary.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grade: { type: Type.INTEGER, description: "A numerical grade from 0 to 100." },
                        feedback: { type: Type.STRING, description: "Constructive feedback for the student." }
                    },
                    required: ["grade", "feedback"]
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error evaluating submission:", error);
        throw new Error("Failed to evaluate submission. The AI evaluator might be temporarily unavailable.");
    }
};

export const generateProgressReport = async (studentName: string, courses: Course[], submissions: Submission[]): Promise<string> => {
    try {
        const relevantSubmissions = submissions.filter(s => s.grade !== null);
        if (relevantSubmissions.length === 0) {
            return "No graded assignments available to generate a report.";
        }
        const prompt = `You are an insightful and encouraging academic advisor. Generate a progress report for a student named ${studentName}.
        
        Here is the data on their graded assignments:
        ${relevantSubmissions.map(s => {
            const course = courses.find(c => c.id === s.courseId);
            const assignment = course?.modules.flatMap(m => m.assignments).find(a => a.id === s.assignmentId);
            return `- Course: ${course?.title || 'N/A'}, Assignment: ${assignment?.title || 'N/A'}, Grade: ${s.grade}/100`;
        }).join('\n')}
        
        Based on this data, write a 2-paragraph summary. Start by highlighting areas of strength and strong performance. Then, gently point out any courses or topics where they might be struggling and suggest a positive next step or area of focus. Maintain a supportive and motivational tone.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {        
        console.error("Error generating progress report:", error);
        throw new Error("Failed to generate progress report.");
    }
};

export const generateAdminPerformanceSummary = async (
    studentName: string, 
    enrolledCount: number, 
    averageGrade: number | null
): Promise<{ summary: string; performance: string; }> => {
    try {
        if (averageGrade === null) {
            const summary = `${studentName} is enrolled in ${enrolledCount} course(s) but has no graded assignments yet.`;
            return {
                summary,
                performance: "N/A"
            };
        }

        const prompt = `You are an administrative academic advisor. Your task is to provide a very brief, one-sentence summary and a single performance label for a student based on their key statistics.

        Student Name: ${studentName}
        Number of Enrolled Courses: ${enrolledCount}
        Average Grade: ${averageGrade}%

        Your entire response MUST be a single JSON object. The JSON object must have two keys:
        1. "summary": A concise single sentence that combines the enrollment and grade information.
        2. "performance": A single word performance label. It must be one of these three strings: "Good", "Average", or "Poor".

        Use the average grade to determine the performance label:
        - A grade above 85% is "Good".
        - A grade between 60% and 85% (inclusive) is "Average".
        - A grade below 60% is "Poor".
        
        Example for a good student:
        {
          "summary": "This student is enrolled in 5 courses and has a strong average grade of 92%.",
          "performance": "Good"
        }
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A single sentence summary of the student's performance." },
                        performance: { type: Type.STRING, description: "A performance label, must be one of: 'Good', 'Average', 'Poor'." }
                    },
                    required: ["summary", "performance"]
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error generating admin performance summary:", error);
        throw new Error("Failed to generate AI summary.");
    }
};


export const getAiStudyHelp = async (course: Course, question: string): Promise<string> => {
    try {
        const courseContext = `
            Course Title: ${course.title}
            Course Description: ${course.description}
            
            Modules:
            ${course.modules.map(mod => `
                ---
                Module Title: ${mod.title}
                Module Description: ${mod.description}
                Module Content: ${mod.content}
                Assignments: ${mod.assignments.map(ass => `
                    - Assignment: ${ass.title}
                    - Prompt: ${ass.prompt}
                `).join('\n')}
                ---
            `).join('\n')}
        `;

        const prompt = `You are a helpful and friendly AI study assistant. Your goal is to help a student understand their course material better. Based ONLY on the provided course context below, please answer the student's question. If the answer is not in the context, say that you cannot answer based on the provided material.
        
        ---COURSE CONTEXT---
        ${courseContext}
        ---END COURSE CONTEXT---
        
        Student's Question: "${question}"
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting AI study help:", error);
        throw new Error("Failed to get a response from the AI study assistant.");
    }
};