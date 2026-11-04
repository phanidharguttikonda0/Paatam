import { z } from 'zod';

export const ingestChapterSchema = z.object({
  body: z
    .object({
      class_subject_id: z.string().optional(),
      classSubjectId: z.string().optional(),
      chapter_text: z.string().optional(),
      chapterText: z.string().optional(),
      pdf_url: z.string().optional(),
      pdfUrl: z.string().optional(),
      chapter_title: z.string().optional(),
      chapterTitle: z.string().optional(),
      chapter_number: z.coerce.number().int().positive().optional(),
      chapterNumber: z.coerce.number().int().positive().optional(),
      file_name: z.string().optional(),
      fileName: z.string().optional(),
    })
    .refine(
      (data) => Boolean(data.class_subject_id || data.classSubjectId),
      {
        message: 'class_subject_id or classSubjectId is required',
      }
    )
    .refine(
      (data) => {
        const text = data.chapter_text || data.chapterText;
        const url = data.pdf_url || data.pdfUrl;
        return (text && text.trim().length >= 10) || Boolean(url);
      },
      {
        message: 'Either chapter_text (minimum 10 characters) or a valid pdf_url is required',
      }
    ),
});

export const listChaptersSchema = z.object({
  query: z
    .object({
      class_subject_id: z.string().optional(),
      classSubjectId: z.string().optional(),
    })
    .refine((data) => Boolean(data.class_subject_id || data.classSubjectId), {
      message: 'class_subject_id or classSubjectId is required',
    }),
});

export const ingestSyllabusSchema = z.object({
  body: z
    .object({
      class_subject_id: z.string().optional(),
      classSubjectId: z.string().optional(),
      syllabus_text: z.string().optional(),
      syllabusText: z.string().optional(),
    })
    .refine((data) => Boolean(data.class_subject_id || data.classSubjectId), {
      message: 'class_subject_id or classSubjectId is required',
    })
    .refine(
      (data) => {
        const text = data.syllabus_text || data.syllabusText;
        return Boolean(text && text.trim().length >= 10);
      },
      { message: 'syllabus_text must be at least 10 characters' }
    ),
});

export const listTopicsSchema = z.object({
  query: z
    .object({
      class_subject_id: z.string().optional(),
      classSubjectId: z.string().optional(),
    })
    .refine((data) => Boolean(data.class_subject_id || data.classSubjectId), {
      message: 'class_subject_id or classSubjectId is required',
    }),
});

export const updateChapterSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Chapter ID is required'),
  }),
  body: z.object({
    chapter_title: z.string().optional(),
    chapterTitle: z.string().optional(),
    chapter_number: z.coerce.number().int().positive().optional(),
    chapterNumber: z.coerce.number().int().positive().optional(),
  }),
});

export const deleteChapterSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Chapter ID is required'),
  }),
});
