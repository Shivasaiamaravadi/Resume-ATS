import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import * as docx from 'docx';
import { ATSAnalysisResult, StructuredResume } from '../types';
import { ScoreDonut } from './ScoreDonut';
import { ResultCard } from './ResultCard';

interface AnalysisResultsProps {
  result: ATSAnalysisResult;
  onReset: () => void;
}

const formatResumeAsText = (resume: StructuredResume): string => {
  let text = '';
  const { contact, summary, skills, experience, education } = resume;

  text += `${contact.name}\n`;
  const contactDetails = [contact.location, contact.phone, contact.email, contact.linkedin].filter(Boolean);
  text += `${contactDetails.join(' | ')}\n\n`;

  text += `SUMMARY\n${summary}\n\n`;

  text += `SKILLS\n`;
  skills.forEach(skillCat => {
    text += `${skillCat.category}: ${skillCat.skills.join(', ')}\n`;
  });
  text += '\n';


  text += `PROFESSIONAL EXPERIENCE\n`;
  experience.forEach(exp => {
    text += `${exp.role}, ${exp.company} | ${exp.location || ''} | ${exp.dates}\n`;
    exp.achievements.forEach(ach => {
      text += `• ${ach}\n`;
    });
    text += '\n';
  });

  text += `EDUCATION\n`;
  education.forEach(edu => {
    text += `${edu.degree}, ${edu.institution} | ${edu.location || ''} | ${edu.graduationDate || ''}\n`;
  });

  return text;
};


export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ result, onReset }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy Text');
  const revisedResumeText = formatResumeAsText(result.revisedResume);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(revisedResumeText).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Text'), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setCopyButtonText('Copy Failed');
      setTimeout(() => setCopyButtonText('Copy Text'), 2000);
    });
  }, [revisedResumeText]);

  const handleDownloadPdf = useCallback(() => {
    const { contact, summary, skills, experience, education } = result.revisedResume;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // --- Header ---
    y += margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(contact.name, pageWidth / 2, y, { align: 'center' });
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const contactDetails = [contact.location, contact.phone, contact.email, contact.linkedin].filter(Boolean).join(' | ');
    doc.text(contactDetails, pageWidth / 2, y, { align: 'center' });
    y += 20;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
        }
    }

    const renderSection = (title: string, content: () => void) => {
        checkPageBreak(40); // Space for header
        y += 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(title.toUpperCase(), margin, y);
        y += 5;
        doc.setDrawColor(150);
        doc.line(margin, y, pageWidth - margin, y);
        y += 15;
        content();
    }

    // --- Summary ---
    renderSection('Summary', () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const summaryLines = doc.splitTextToSize(summary, contentWidth);
        checkPageBreak(summaryLines.length * 12);
        doc.text(summaryLines, margin, y);
        y += summaryLines.length * 12;
    });

    // --- Skills ---
    renderSection('Skills', () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const categoryWidth = 120;
        const skillsIndent = margin + categoryWidth;
        const skillsWidth = contentWidth - categoryWidth;

        skills.forEach(skillCat => {
            const skillsText = skillCat.skills.join(', ');
            const skillsLines = doc.splitTextToSize(skillsText, skillsWidth);
            const neededHeight = skillsLines.length * 12 + 5;
            checkPageBreak(neededHeight);
            
            doc.setFont('helvetica', 'bold');
            doc.text(`${skillCat.category}:`, margin, y, { align: 'left' });
            doc.setFont('helvetica', 'normal');
            doc.text(skillsLines, skillsIndent, y);
            
            y += neededHeight;
        });
    });

    // --- Experience ---
    renderSection('Professional Experience', () => {
        experience.forEach(exp => {
            checkPageBreak(60); // Estimate space for a job entry
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(exp.role, margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(exp.dates, pageWidth - margin, y, { align: 'right' });
            y += 14;

            doc.setFont('helvetica', 'italic');
            doc.text(`${exp.company} | ${exp.location || ''}`, margin, y);
            y += 16;
            
            doc.setFont('helvetica', 'normal');
            exp.achievements.forEach(ach => {
                const achievementLines = doc.splitTextToSize(`• ${ach}`, contentWidth - 10); // Indent bullet
                checkPageBreak(achievementLines.length * 12 + 5);
                doc.text(achievementLines, margin + 10, y);
                y += achievementLines.length * 12 + 5;
            });
            y += 10;
        });
    });

    // --- Education ---
    renderSection('Education', () => {
        education.forEach(edu => {
            checkPageBreak(30);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(edu.degree, margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(edu.graduationDate || '', pageWidth - margin, y, { align: 'right' });
            y += 14;

            doc.setFont('helvetica', 'italic');
            doc.text(`${edu.institution} | ${edu.location || ''}`, margin, y);
            y += 14;
        });
    });

    doc.save('Revised_Resume.pdf');
  }, [result.revisedResume]);

  const handleDownloadDocx = useCallback(() => {
    const { contact, summary, skills, experience, education } = result.revisedResume;
    
    const createSection = (title: string) => new docx.Paragraph({
        text: title.toUpperCase(),
        heading: docx.HeadingLevel.HEADING_2,
        style: 'sectionHeading',
    });

    const doc = new docx.Document({
      styles: {
        paragraphStyles: [
            { id: "normal", name: "Normal", run: { font: "Calibri", size: 22 } },
            { id: "contact", name: "Contact", basedOn: "normal", run: { size: 20 }, alignment: docx.AlignmentType.CENTER },
            { id: "sectionHeading", name: "Section Heading", basedOn: "normal", run: { bold: true, size: 24, allCaps: true }, border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } }, spacing: { before: 240, after: 120 } },
            { id: "jobTitle", name: "Job Title", basedOn: "normal", run: { bold: true } },
            { id: "company", name: "Company", basedOn: "normal", run: { italics: true } },
        ]
      },
      sections: [{
        children: [
          new docx.Paragraph({
            text: contact.name.toUpperCase(),
            heading: docx.HeadingLevel.TITLE,
            alignment: docx.AlignmentType.CENTER,
            style: 'normal',
            run: { size: 52, bold: true },
          }),
          new docx.Paragraph({
            text: [contact.location, contact.phone, contact.email, contact.linkedin].filter(Boolean).join(' | '),
            style: 'contact',
          }),
          new docx.Paragraph({ text: "" }), // Spacer
          
          // Summary
          createSection('Summary'),
          new docx.Paragraph({ text: summary, style: 'normal' }),

          // Skills
          createSection('Skills'),
          new docx.Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            borders: docx.TableBorders.NONE,
            rows: skills.map(skillCat => new docx.TableRow({
              children: [
                new docx.TableCell({
                  width: { size: 20, type: docx.WidthType.PERCENTAGE },
                  children: [new docx.Paragraph({ text: `${skillCat.category}:`, run: { bold: true } })],
                }),
                new docx.TableCell({
                  width: { size: 80, type: docx.WidthType.PERCENTAGE },
                  children: [new docx.Paragraph({ text: skillCat.skills.join(', ') })],
                }),
              ],
            })),
          }),

          // Professional Experience
          createSection('Professional Experience'),
          ...experience.flatMap(exp => [
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: exp.role, bold: true }),
                new docx.TextRun({ text: `\t${exp.dates}` }),
              ],
              style: 'jobTitle',
            }),
            new docx.Paragraph({ text: `${exp.company} | ${exp.location || ''}`, style: 'company' }),
            ...exp.achievements.map(ach => new docx.Paragraph({ text: ach, bullet: { level: 0 }, style: 'normal', indentation: { left: 720 } })),
            new docx.Paragraph({ text: "" }), // Spacer
          ]),
          
          // Education
          createSection('Education'),
          ...education.flatMap(edu => [
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: edu.degree, bold: true }),
                new docx.TextRun({ text: `\t${edu.graduationDate || ''}` }),
              ],
               style: 'jobTitle',
            }),
            new docx.Paragraph({ text: `${edu.institution} | ${edu.location || ''}`, style: 'company' }),
          ]),
        ],
      }],
    });

    docx.Packer.toBlob(doc).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Revised_Resume.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

  }, [result.revisedResume]);


  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Your Resume Analysis is Ready</h2>
        <div className="flex gap-4 flex-shrink-0 flex-wrap">
          <button
            onClick={handleDownloadPdf}
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
          >
            Download PDF
          </button>
          <button
            onClick={handleDownloadDocx}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Download DOCX
          </button>
          <button
            onClick={handleCopy}
            className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
          >
            {copyButtonText}
          </button>
          <button
            onClick={onReset}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Revise Another
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column for Scores and Feedback */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <ResultCard title="ATS Score Comparison">
            <div className="flex justify-around items-center text-center p-4">
              <div>
                <ScoreDonut score={result.originalAtsScore} />
                <p className="mt-2 font-semibold text-slate-600">Original Score</p>
              </div>
              <div className="text-3xl text-slate-300">&rarr;</div>
              <div>
                <ScoreDonut score={result.revisedAtsScore} />
                <p className="mt-2 font-semibold text-slate-600">Revised Score</p>
              </div>
            </div>
          </ResultCard>
          <ResultCard title="Key Improvements">
            <ul className="list-disc list-inside space-y-2 text-slate-600">
                {result.feedback.split('*').filter(item => item.trim()).map((item, index) => (
                    <li key={index}>{item.trim()}</li>
                ))}
            </ul>
          </ResultCard>
        </div>

        {/* Right Column for Revised Resume */}
        <div className="lg:col-span-2">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 h-full">
                <h3 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Optimized Resume Text</h3>
                <pre className="whitespace-pre-wrap break-words font-sans text-slate-700 text-base leading-relaxed max-h-[80vh] overflow-y-auto">
                    {revisedResumeText}
                </pre>
            </div>
        </div>
      </div>
    </div>
  );
};