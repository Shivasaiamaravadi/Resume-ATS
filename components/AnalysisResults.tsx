
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
            // FIX: The 'alignment' property should be nested inside a 'paragraph' object for paragraph styles.
            { id: "contact", name: "Contact", basedOn: "normal", run: { size: 20 }, paragraph: { alignment: docx.AlignmentType.CENTER } },
            // FIX: The 'border' and 'spacing' properties should be nested inside a 'paragraph' object for paragraph styles.
            // FIX: The property for border style is 'style', not 'value'.
            { id: "sectionHeading", name: "Section Heading", basedOn: "normal", run: { bold: true, size: 24, allCaps: true }, paragraph: { border: { bottom: { color: "auto", space: 1, style: "single", size: 6 } }, spacing: { before: 240, after: 120 } } },
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
            // FIX: The property for indentation is 'indent', not 'indentation'.
            ...exp.achievements.map(ach => new docx.Paragraph({ text: ach, bullet: { level: 0 }, style: 'normal', indent: { left: 720 } })),
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
            new docx.Paragraph({ text: "" }),
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-xl shadow-lg border border-slate-200">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Your Resume Analysis is Complete!</h2>
        <button
          onClick={onReset}
          className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
        >
          Revise Another
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ResultCard title="ATS Score Improvement">
          <div className="flex justify-around items-center text-center">
            <div>
              <h4 className="text-lg font-semibold text-slate-600 mb-2">Original Score</h4>
              <ScoreDonut score={result.originalAtsScore} />
            </div>
            <div className="text-4xl text-slate-400">&rarr;</div>
            <div>
              <h4 className="text-lg font-semibold text-slate-600 mb-2">Revised Score</h4>
              <ScoreDonut score={result.revisedAtsScore} />
            </div>
          </div>
        </ResultCard>
        <ResultCard title="Key Revisions & Feedback">
            <div 
              className="prose prose-slate max-w-none prose-ul:list-disc prose-ul:pl-5"
              dangerouslySetInnerHTML={{ __html: `<ul>${result.feedback.split('\n').filter(line => line.trim().startsWith('*')).map(line => line.replace(/^\* /, '<li>') + '</li>').join('')}</ul>` }}
            />
        </ResultCard>
      </div>

      <ResultCard title="Revised Resume (ATS Optimized)">
        <div className="flex justify-end gap-2 mb-4">
            <button onClick={handleCopy} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 font-semibold rounded-md hover:bg-slate-200 transition-colors">{copyButtonText}</button>
            <button onClick={handleDownloadPdf} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 font-semibold rounded-md hover:bg-blue-200 transition-colors">Download PDF</button>
            <button onClick={handleDownloadDocx} className="px-4 py-2 text-sm bg-green-100 text-green-700 font-semibold rounded-md hover:bg-green-200 transition-colors">Download DOCX</button>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm font-mono">{revisedResumeText}</pre>
        </div>
      </ResultCard>
    </div>
  );
};
