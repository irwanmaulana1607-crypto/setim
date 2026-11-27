export type AcademicProfile = { user_id: string; university: string; faculty: string; department: string; academic_program: string; academic_year: string; bio: string; interests_summary: string };
export type AcademicCourse = { id?: string; course_name: string; course_code: string; description: string; category: string; mastery_level: string; learning_status: string };
export type AcademicSkill = { id?: string; skill_name: string; category: string; proficiency_level: string; description: string };
export type AcademicInterest = { id?: string; interest_name: string; category: string };
export type AcademicObjective = { id?: string; objective_type: string; description: string };
export type AcademicAvailability = { id?: string; day_of_week: number; start_time: string; end_time: string; timezone: string };
export type AcademicPortfolio = { id?: string; title: string; description: string; category: string; entry_year: string; related_skills: string[]; external_url: string };
export type AcademicData = { profile: AcademicProfile | null; courses: AcademicCourse[]; skills: AcademicSkill[]; interests: AcademicInterest[]; objectives: AcademicObjective[]; availability: AcademicAvailability[]; portfolio: AcademicPortfolio[] };
