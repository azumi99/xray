export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: boolean;
  message: string;
  data: Data;
}

export interface Data {
  user: User;
  token: string;
  name: string;
}

export interface User {
  id: number;
  name: string;
  nik: string;
  email: string;
  department_code: string;
  level_no: string;
  email_verified_at: string;
  images: string;
  role: string;
  created_at: string;
  updated_at: string;
  branch_code: string;
  phone_no: string;
  department: Department;
}

export interface Department {
  id: number;
  department_code: string;
  department_name: string;
  description: string;
  created_at: string;
  updated_at: string;
  department_cat: string;
  branch_code: string;
}
