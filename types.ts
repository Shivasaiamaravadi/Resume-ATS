export interface ResumeContact {
  name: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  location?: string;
}

export interface ResumeExperience {
  role: string;
  company: string;
  location?: string;
  dates: string;
  achievements: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  location?: string;
  graduationDate?: string;
}

export interface ResumeSkillCategory {
  category: string;
  skills: string[];
}

export interface StructuredResume {
  contact: ResumeContact;
  summary: string;
  skills: ResumeSkillCategory[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
}

export interface ATSAnalysisResult {
  originalAtsScore: number;
  revisedAtsScore: number;
  feedback: string;
  revisedResume: StructuredResume;
}