-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for appointment status
CREATE TYPE appointment_status AS ENUM ('pending', 'approved', 'declined', 'completed');

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('security', 'admin', 'employee');

-- Create employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create visitors table
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  qr_code TEXT UNIQUE,
  visitor_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  status appointment_status DEFAULT 'pending',
  calendar_blocked BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create check_ins table for security tracking
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  security_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table for role management
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees (viewable by everyone for "whom to meet" selection)
CREATE POLICY "Employees are viewable by everyone"
  ON employees FOR SELECT
  USING (TRUE);

CREATE POLICY "Only admins can insert employees"
  ON employees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update employees"
  ON employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for visitors (public insert for registration, authenticated read)
CREATE POLICY "Anyone can register as visitor"
  ON visitors FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can view visitors"
  ON visitors FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can update visitors"
  ON visitors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for appointments
CREATE POLICY "Anyone can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can view appointments"
  ON appointments FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Employees can update their own appointments"
  ON appointments FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'security')
    )
  );

-- RLS Policies for check_ins
CREATE POLICY "Security and admins can insert check_ins"
  ON check_ins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('security', 'admin')
    )
  );

CREATE POLICY "Security and admins can view check_ins"
  ON check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('security', 'admin')
    )
  );

CREATE POLICY "Security and admins can update check_ins"
  ON check_ins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('security', 'admin')
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_appointments_visitor ON appointments(visitor_id);
CREATE INDEX idx_appointments_employee ON appointments(employee_id);
CREATE INDEX idx_appointments_date ON appointments(visit_date);
CREATE INDEX idx_check_ins_visitor ON check_ins(visitor_id);
CREATE INDEX idx_check_ins_appointment ON check_ins(appointment_id);
CREATE INDEX idx_visitors_email ON visitors(email);
CREATE INDEX idx_employees_email ON employees(email);