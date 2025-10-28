import React, { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoadingIcon } from './components/LoadingIcon';
import { AnalysisResults } from './components/AnalysisResults';
import { analyzeAndReviseResume } from './services/geminiService';
import { ATSAnalysisResult } from './types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136/build/pdf.worker.min.mjs`;

// mammoth.js is loaded from a script tag in index.html and is available globally
declare var mammoth: any;

const App: React.FC = () => {
  const [resumeText, setResumeText] = useState<string>('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<ATSAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const parseResumeFile = async (file: File): Promise<string> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });

    const arrayBuffer = await readFileAsArrayBuffer(file);

    if (fileExtension === 'pdf') {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return text;
    } else if (fileExtension === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (fileExtension === 'doc') {
      throw new Error('.doc files are not supported. Please save as .docx or .pdf.');
    } else {
      throw new Error('Unsupported file type. Please upload a .pdf or .docx file.');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setResumeFile(file);
      setIsLoading(true);
      setLoadingMessage('Parsing your resume...');
      try {
        const text = await parseResumeFile(file);
        setResumeText(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file.');
        handleRemoveFile(); // Reset file state on error
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    }
  };

  const handleRemoveFile = useCallback(() => {
    setResumeFile(null);
    setResumeText('');
    const input = document.getElementById('resume-file-input') as HTMLInputElement;
    if (input) input.value = '';
  }, []);

  const handleRevise = useCallback(async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please provide both your resume and the job description.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setLoadingMessage('Analyzing and revising your resume... This may take a moment.');
    setAnalysisResult(null);

    try {
      const result = await analyzeAndReviseResume(resumeText, jobDescription);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during revision.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [resumeText, jobDescription]);

  const handleReset = useCallback(() => {
    setResumeText('');
    setJobDescription('');
    handleRemoveFile();
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
  }, [handleRemoveFile]);

  const isButtonDisabled = isLoading || !resumeText.trim() || !jobDescription.trim();

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!analysisResult && !isLoading && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">AI-Powered Resume Revision</h2>
            <p className="mt-4 text-lg text-slate-600">Upload your resume and a target job description to get a professionally revised, ATS-friendly version.</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <LoadingIcon />
            <p className="text-lg text-slate-600 mt-4">{loadingMessage}</p>
          </div>
        ) : analysisResult ? (
          <AnalysisResults result={analysisResult} onReset={handleReset} />
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <label className="block text-lg font-semibold text-slate-700 mb-2">
                  Upload Your Current Resume
                </label>
                {resumeFile ? (
                  <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-300 rounded-lg">
                    <div className="flex items-center gap-2 overflow-hidden">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                       </svg>
                      <span className="text-slate-700 font-medium truncate" title={resumeFile.name}>{resumeFile.name}</span>
                    </div>
                    <button onClick={handleRemoveFile} className="p-1 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors" aria-label="Remove file">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                    <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <label htmlFor="resume-file-input" className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <span>Upload a file</span>
                        <input id="resume-file-input" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
                    </label>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOCX supported</p>
                  </div>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <label htmlFor="job-description" className="block text-lg font-semibold text-slate-700 mb-2">
                  Paste Target Job Description
                </label>
                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description for the role you're targeting..."
                  className="w-full h-96 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                  aria-label="Target Job Description Input"
                />
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleRevise}
                disabled={isButtonDisabled}
                className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Revise My Resume
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;