export enum UserRole {
  Student = 'Student',
  Teacher = 'Teacher',
  Administrator = 'Administrator',
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface Assignment {
  id: string;
  title: string;
  prompt: string;
}

export interface Module {
  id:string;
  title: string;
  description: string;
  content: string;
  assignments: Assignment[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string; // The ID of the teacher who created the course
  modules: Module[];
  enrolledStudentIds: string[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  courseId: string;
  teacherId: string; // The ID of the teacher for this submission's course
  content: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
}