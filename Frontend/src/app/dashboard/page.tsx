
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";

import { apiFetch, ApiError } from "@/lib/api";
import AttendancePanel from "@/features/attendance/attendance-panel";

const { Title, Text } = Typography;

// -------------------------------------
// TYPES
// -------------------------------------

type Role = "admin" | "hr" | "employee";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
};

type Department = {
  _id: string;
  name: string;
};

type Company = {
  name: string;
  officeStart: string;
  graceMinutes: number;
  halfDayHours: number;
  weekends: number[];
};

type Employee = {
  _id: string;
  employeeCode: string;
  user: {
    name: string;
    email: string;
  };
  department: Department;
  designation: string;
  joiningDate: string;
  basicSalary?: number;
  phone?: string;
  address?: string;
  employmentStatus: string;
};

type HrUser = {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword?: boolean;
};

type EmployeeForm = {
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation: string;
  joiningDate: string;
  basicSalary: number;
  password: string;
  phone?: string;
  address?: string;
};

type HrForm = {
  name: string;
  email: string;
  password: string;
};

type ChangePasswordForm = {
  currentPassword: string;
  newPassword: string;
};

type CompanyForm = {
  name: string;
  officeStart: string;
  graceMinutes: number;
  halfDayHours: number;
};

type DepartmentForm = {
  name: string;
};

// -------------------------------------
// DASHBOARD
// -------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hrUsers, setHrUsers] = useState<HrUser[]>([]);
  const [myProfile, setMyProfile] = useState<Employee | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departmentForm] = Form.useForm<DepartmentForm>();
  const [companyForm] = Form.useForm<CompanyForm>();
  const [hrForm] = Form.useForm<HrForm>();
  const [employeeForm] = Form.useForm<EmployeeForm>();
  const [passwordForm] = Form.useForm<ChangePasswordForm>();

  // -------------------------------------
  // LOAD DATA BASED ON USER ROLE
  // -------------------------------------

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const auth = await apiFetch<{
        success: boolean;
        user: User;
      }>("/auth/me");

      const currentUser = auth.user;

      setUser(currentUser);

      // New users must change temporary password first
      if (currentUser.mustChangePassword) {
        return;
      }

      // ADMIN
      if (currentUser.role === "admin") {
        const [
          companyResult,
          departmentResult,
          hrResult,
          employeeResult,
        ] = await Promise.all([
          apiFetch<{ company: Company | null }>("/company"),
          apiFetch<{ departments: Department[] }>("/departments"),
          apiFetch<{ users: HrUser[] }>("/admin/hr"),
          apiFetch<{ employees: Employee[] }>("/employees"),
        ]);

        setCompany(companyResult.company);
        setDepartments(departmentResult.departments);
        setHrUsers(hrResult.users);
        setEmployees(employeeResult.employees);
      }

      // HR
      if (currentUser.role === "hr") {
        const [departmentResult, employeeResult] =
          await Promise.all([
            apiFetch<{ departments: Department[] }>("/departments"),
            apiFetch<{ employees: Employee[] }>("/employees"),
          ]);

        setDepartments(departmentResult.departments);
        setEmployees(employeeResult.employees);
      }

      // EMPLOYEE
      if (currentUser.role === "employee") {
        const result = await apiFetch<{
          employee: Employee;
        }>("/employees/me");

        setMyProfile(result.employee);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        return;
      }

      message.error(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, [router, message]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // -------------------------------------
  // REUSABLE FORM SUBMISSION
  // -------------------------------------

  async function submitAction(
    request: () => Promise<unknown>,
    successText: string,
    reset?: () => void
  ) {
    setSaving(true);

    try {
      await request();

      message.success(successText);

      reset?.();

      await loadDashboard();
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Request failed"
      );
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------
  // LOGOUT
  // -------------------------------------

  async function signOut() {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
      });

      window.location.href = "/login";
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Sign out failed"
      );
    }
  }

  // -------------------------------------
  // LOADING
  // -------------------------------------

  if (loading && !user) {
    return (
      <main style={{ padding: 32 }}>
        <Text>Loading dashboard...</Text>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: 32 }}>
        <Text>Checking your session...</Text>
      </main>
    );
  }

  // -------------------------------------
  // FIRST LOGIN PASSWORD CHANGE
  // -------------------------------------

  if (user.mustChangePassword) {
    return (
      <main
        style={{
          maxWidth: 480,
          margin: "60px auto",
          padding: 20,
        }}
      >
        <Card>
          <Title level={3}>
            Change Temporary Password
          </Title>

          <Text>
            Welcome, {user.name}. Please change your
            temporary password before accessing HCM Lite.
          </Text>

          <Form<ChangePasswordForm>
            form={passwordForm}
            layout="vertical"
            style={{ marginTop: 24 }}
            onFinish={(values) =>
              submitAction(
                () =>
                  apiFetch("/auth/change-password", {
                    method: "POST",
                    body: JSON.stringify(values),
                  }),
                "Password changed successfully",
                () => passwordForm.resetFields()
              )
            }
          >
            <Form.Item
              label="Current Password"
              name="currentPassword"
              rules={[
                {
                  required: true,
                  message: "Enter your current password",
                },
              ]}
            >
              <Input.Password
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="newPassword"
              rules={[
                {
                  required: true,
                  message: "Enter a new password",
                },
                {
                  min: 8,
                  message: "Minimum 8 characters",
                },
                {
                  validator: (_, value: string | undefined) =>
                    !value ||
                    new TextEncoder().encode(value).length <= 72
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error("Maximum 72 UTF-8 bytes")
                        ),
                },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              block
            >
              Change Password
            </Button>
          </Form>

          <Button
            style={{ marginTop: 12 }}
            onClick={signOut}
          >
            Sign Out
          </Button>
        </Card>
      </main>
    );
  }

  // -------------------------------------
  // MAIN DASHBOARD
  // -------------------------------------

  return (
    <main
      style={{
        maxWidth: 1150,
        margin: "0 auto",
        padding: 24,
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}

      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
        wrap
      >
        <div>
          <Link href="/">← Home</Link>

          <Title
            level={2}
            style={{ margin: "12px 0 0" }}
          >
            HCM Lite
          </Title>

          <Text>Welcome, {user.name}</Text>

          <div style={{ marginTop: 8 }}>
            <Tag color="blue">
              {user.role.toUpperCase()}
            </Tag>
          </div>
        </div>

        <Button onClick={signOut}>
          Sign Out
        </Button>
      </Space>

      {/* ===================================
          ADMIN DASHBOARD
      =================================== */}

      {user.role === "admin" && (
        <Space
          direction="vertical"
          size="large"
          style={{ width: "100%" }}
        >
          <Title level={3}>
            Admin Dashboard
          </Title>

          {/* REAL DATABASE COUNTS */}

          <Space wrap>
            <Card>
              <Text type="secondary">
                Departments
              </Text>
              <Title level={2}>
                {departments.length}
              </Title>
            </Card>

            <Card>
              <Text type="secondary">
                HR Accounts
              </Text>
              <Title level={2}>
                {hrUsers.length}
              </Title>
            </Card>

            <Card>
              <Text type="secondary">
                Employees
              </Text>
              <Title level={2}>
                {employees.length}
              </Title>
            </Card>
          </Space>

          {/* COMPANY SETTINGS */}

          <Card title="Company Settings">
            {company ? (
              <Space direction="vertical">
                <Text strong>
                  {company.name}
                </Text>

                <Text>
                  Office Start: {company.officeStart}
                </Text>

                <Text>
                  Grace Period: {company.graceMinutes} minutes
                </Text>

                <Text>
                  Half Day: {company.halfDayHours} hours
                </Text>

                <Text>
                  Weekends:{" "}
                  {company.weekends
                    .map((day) =>
                      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]
                    )
                    .join(", ")}
                </Text>
              </Space>
            ) : (
              <Form<CompanyForm>
                form={companyForm}
                layout="vertical"
                initialValues={{
                  officeStart: "09:00",
                  graceMinutes: 15,
                  halfDayHours: 5,
                }}
                onFinish={(values) =>
                  submitAction(
                    () =>
                      apiFetch("/company", {
                        method: "POST",
                        body: JSON.stringify({
                          ...values,
                          weekends: [0, 6],
                        }),
                      }),
                    "Company created successfully",
                    () => companyForm.resetFields()
                  )
                }
              >
                <Form.Item
                  label="Company Name"
                  name="name"
                  rules={[
                    { required: true, min: 2 },
                  ]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Office Start Time"
                  name="officeStart"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="09:00" />
                </Form.Item>

                <Form.Item
                  label="Grace Minutes"
                  name="graceMinutes"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={0} />
                </Form.Item>

                <Form.Item
                  label="Half-Day Hours"
                  name="halfDayHours"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                >
                  Save Company
                </Button>
              </Form>
            )}
          </Card>

          {/* CREATE DEPARTMENT */}

          <Card title="Departments">
            <Form<DepartmentForm>
              form={departmentForm}
              layout="inline"
              onFinish={(values) =>
                submitAction(
                  () =>
                    apiFetch("/departments", {
                      method: "POST",
                      body: JSON.stringify(values),
                    }),
                  "Department created",
                  () => departmentForm.resetFields()
                )
              }
            >
              <Form.Item
                name="name"
                rules={[
                  { required: true, min: 2 },
                ]}
              >
                <Input
                  placeholder="Department name"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
              >
                Add Department
              </Button>
            </Form>

            <div style={{ marginTop: 20 }}>
              {departments.map((dept) => (
                <Tag key={dept._id}>
                  {dept.name}
                </Tag>
              ))}

              {departments.length === 0 && (
                <Text type="secondary">
                  No departments created yet.
                </Text>
              )}
            </div>
          </Card>

          {/* CREATE HR ACCOUNT */}

          <Card title="Create HR Account">
            <Form<HrForm>
              form={hrForm}
              layout="vertical"
              onFinish={(values) =>
                submitAction(
                  () =>
                    apiFetch("/admin/hr", {
                      method: "POST",
                      body: JSON.stringify(values),
                    }),
                  "HR account created successfully",
                  () => hrForm.resetFields()
                )
              }
            >
              <Form.Item
                label="Full Name"
                name="name"
                rules={[
                  { required: true, min: 2 },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, type: "email" },
                ]}
              >
                <Input type="email" />
              </Form.Item>

              <Form.Item
                label="Temporary Password"
                name="password"
                rules={[
                  { required: true, min: 8 },
                ]}
              >
                <Input.Password
                  autoComplete="new-password"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
              >
                Create HR
              </Button>
            </Form>
          </Card>

          {/* HR ACCOUNTS LIST */}

          <Card title="HR Accounts">
            <Table<HrUser>
              rowKey="_id"
              dataSource={hrUsers}
              loading={loading}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 500 }}
              columns={[
                {
                  title: "Name",
                  dataIndex: "name",
                },
                {
                  title: "Email",
                  dataIndex: "email",
                },
                {
                  title: "Status",
                  dataIndex: "isActive",
                  render: (active: boolean) => (
                    <Tag color={active ? "green" : "red"}>
                      {active ? "Active" : "Inactive"}
                    </Tag>
                  ),
                },
                {
                  title: "Password Status",
                  dataIndex: "mustChangePassword",
                  render: (required: boolean | undefined) =>
                    required ? "Change required" : "Ready",
                },
              ]}
            />
          </Card>
        </Space>
      )}

      {/* ===================================
          HR DASHBOARD
      =================================== */}

      {user.role === "hr" && (
        <Space
          direction="vertical"
          size="large"
          style={{ width: "100%" }}
        >
          <Title level={3}>
            HR Dashboard
          </Title>

          <Card>
            <Text type="secondary">
              Total Registered Employees
            </Text>

            <Title level={2}>
              {employees.length}
            </Title>
          </Card>

          {/* EMPLOYEE REGISTRATION */}

          <Card title="Register New Employee">
            <Form<EmployeeForm>
              form={employeeForm}
              layout="vertical"
              onFinish={(values) =>
                submitAction(
                  () =>
                    apiFetch("/employees", {
                      method: "POST",
                      body: JSON.stringify(values),
                    }),
                  "Employee registered successfully",
                  () => employeeForm.resetFields()
                )
              }
            >
              <Form.Item
                label="Full Name"
                name="name"
                rules={[
                  { required: true, min: 2 },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, type: "email" },
                ]}
              >
                <Input type="email" />
              </Form.Item>

              <Form.Item
                label="Employee Code"
                name="employeeCode"
                rules={[{ required: true }]}
              >
                <Input placeholder="EMP002" />
              </Form.Item>

              <Form.Item
                label="Department"
                name="department"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Select Department"
                  options={departments.map((dept) => ({
                    label: dept.name,
                    value: dept._id,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="Designation"
                name="designation"
                rules={[
                  { required: true, min: 2 },
                ]}
              >
                <Input placeholder="Software Developer" />
              </Form.Item>

              <Form.Item
                label="Joining Date"
                name="joiningDate"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item
                label="Basic Salary (PKR)"
                name="basicSalary"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label="Phone (optional)"
                name="phone"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Address (optional)"
                name="address"
              >
                <Input.TextArea rows={2} />
              </Form.Item>

              <Form.Item
                label="Temporary Password"
                name="password"
                rules={[
                  { required: true, min: 8 },
                ]}
              >
                <Input.Password
                  autoComplete="new-password"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                block
              >
                Register Employee
              </Button>
            </Form>
          </Card>
        </Space>
      )}

      {/* ===================================
          EMPLOYEE DIRECTORY
          ADMIN + HR
      =================================== */}

      {(user.role === "admin" || user.role === "hr") && (
        <Card
          title="Employee Directory"
          style={{ marginTop: 24 }}
        >
          <Table<Employee>
            rowKey="_id"
            dataSource={employees}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 850 }}
            columns={[
              {
                title: "Code",
                dataIndex: "employeeCode",
              },
              {
                title: "Name",
                render: (_, record) =>
                  record.user?.name || "—",
              },
              {
                title: "Email",
                render: (_, record) =>
                  record.user?.email || "—",
              },
              {
                title: "Department",
                render: (_, record) =>
                  record.department?.name || "—",
              },
              {
                title: "Designation",
                dataIndex: "designation",
              },
              {
                title: "Basic Salary (PKR)",
                dataIndex: "basicSalary",
                render: (value: number | undefined) =>
                  value == null
                    ? "—"
                    : value.toLocaleString("en-PK"),
              },
              {
                title: "Status",
                dataIndex: "employmentStatus",
                render: (status: string) => (
                  <Tag
                    color={
                      status === "active"
                        ? "green"
                        : "orange"
                    }
                  >
                    {status}
                  </Tag>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ===================================
          EMPLOYEE DASHBOARD
      =================================== */}

      {user.role === "employee" && (
        <Space
          direction="vertical"
          size="large"
          style={{ width: "100%" }}
        >
          <Title level={3}>
            Employee Dashboard
          </Title>

          <Card title="My Profile">
            {myProfile ? (
              <Space direction="vertical">
                <Text strong>
                  {myProfile.user?.name}
                </Text>

                <Text>
                  Employee Code: {myProfile.employeeCode}
                </Text>

                <Text>
                  Email: {myProfile.user?.email}
                </Text>

                <Text>
                  Department: {myProfile.department?.name}
                </Text>

                <Text>
                  Designation: {myProfile.designation}
                </Text>

                <Text>
                  Joining Date:{" "}
                  {new Date(
                    myProfile.joiningDate
                  ).toLocaleDateString("en-PK")}
                </Text>

                {myProfile.phone && (
                  <Text>
                    Phone: {myProfile.phone}
                  </Text>
                )}

                {myProfile.address && (
                  <Text>
                    Address: {myProfile.address}
                  </Text>
                )}

                <Tag color="green">
                  {myProfile.employmentStatus}
                </Tag>
              </Space>
            ) : (
              <Text type="secondary">
                Loading employee profile...
              </Text>
            )}
          </Card>
        </Space>
      )}

      {/* ===================================
          ATTENDANCE MANAGEMENT
          ALL THREE ROLES
      =================================== */}

      <AttendancePanel role={user.role} />

    </main>
  );
}
