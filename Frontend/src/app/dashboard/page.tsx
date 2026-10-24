
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

import { apiFetch } from "@/lib/api";

const { Title, Text } = Typography;

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "hr" | "employee";
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
  employmentStatus: string;
};

type HrUser = {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
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

  const [departmentForm] = Form.useForm();
  const [companyForm] = Form.useForm();
  const [hrForm] = Form.useForm<HrForm>();
  const [employeeForm] = Form.useForm<EmployeeForm>();
  const [passwordForm] = Form.useForm<ChangePasswordForm>();

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const auth = await apiFetch<{ user: User }>("/auth/me");
      const currentUser = auth.user;

      setUser(currentUser);

      if (currentUser.mustChangePassword) {
        return;
      }

      if (currentUser.role === "admin") {
        const [companyResult, deptResult, hrResult, empResult] =
          await Promise.all([
            apiFetch<{ company: Company | null }>("/company"),
            apiFetch<{ departments: Department[] }>("/departments"),
            apiFetch<{ users: HrUser[] }>("/admin/hr"),
            apiFetch<{ employees: Employee[] }>("/employees"),
          ]);

        setCompany(companyResult.company);
        setDepartments(deptResult.departments);
        setHrUsers(hrResult.users);
        setEmployees(empResult.employees);
      }

      if (currentUser.role === "hr") {
        const [deptResult, empResult] = await Promise.all([
          apiFetch<{ departments: Department[] }>("/departments"),
          apiFetch<{ employees: Employee[] }>("/employees"),
        ]);

        setDepartments(deptResult.departments);
        setEmployees(empResult.employees);
      }

      if (currentUser.role === "employee") {
        const result = await apiFetch<{ employee: Employee }>(
          "/employees/me"
        );
        setMyProfile(result.employee);
      }
    } catch (error) {
      const details =
        error instanceof Error ? error.message : "Could not load dashboard";

      if (
        details.toLowerCase().includes("unauthorized") ||
        details.toLowerCase().includes("session") ||
        details.toLowerCase().includes("log in") ||
        details.toLowerCase().includes("authentication")
      ) {
        router.replace("/login");
      } else {
        message.error(details);
      }
    } finally {
      setLoading(false);
    }
  }, [message, router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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
        error instanceof Error ? error.message : "Request failed"
      );
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Sign out failed"
      );
    }
  }

  if (loading && !user) {
    return <main style={{ padding: 32 }}>Loading dashboard...</main>;
  }

  if (!user) {
    return <main style={{ padding: 32 }}>Checking your session...</main>;
  }

  // First-login password change
  if (user.mustChangePassword) {
    return (
      <main style={{ maxWidth: 480, margin: "60px auto", padding: 20 }}>
        <Card>
          <Title level={3}>Change temporary password</Title>
          <Text>
            Welcome, {user.name}. Change your temporary password
            before accessing HCM Lite.
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
              name="currentPassword"
              label="Temporary password"
              rules={[{ required: true }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New password"
              rules={[{ required: true, min: 8 }]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={saving} block>
              Change password
            </Button>
          </Form>

          <Button style={{ marginTop: 12 }} onClick={signOut}>
            Sign out
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1150, margin: "0 auto", padding: 24 }}>
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
          <Title level={2} style={{ margin: "12px 0 0" }}>
            HCM Lite
          </Title>
          <Text>Welcome, {user.name}</Text>
          <div style={{ marginTop: 8 }}>
            <Tag color="blue">{user.role.toUpperCase()}</Tag>
          </div>
        </div>

        <Button onClick={signOut}>Sign out</Button>
      </Space>

      {/* ADMIN DASHBOARD */}
      {user.role === "admin" && (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Title level={3}>Admin Dashboard</Title>

          <Space wrap>
            <Card>
              <Text>Departments</Text>
              <Title level={2}>{departments.length}</Title>
            </Card>

            <Card>
              <Text>HR Accounts</Text>
              <Title level={2}>{hrUsers.length}</Title>
            </Card>

            <Card>
              <Text>Employees</Text>
              <Title level={2}>{employees.length}</Title>
            </Card>
          </Space>

          <Card title="Company Settings">
            {company ? (
              <Space direction="vertical">
                <Text strong>{company.name}</Text>
                <Text>Office starts: {company.officeStart}</Text>
                <Text>Grace period: {company.graceMinutes} minutes</Text>
                <Text>Half day: {company.halfDayHours} hours</Text>
              </Space>
            ) : (
              <Form
                form={companyForm}
                layout="vertical"
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
                    "Company created",
                    () => companyForm.resetFields()
                  )
                }
              >
                <Form.Item
                  label="Company name"
                  name="name"
                  rules={[{ required: true, min: 2 }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Office start"
                  name="officeStart"
                  initialValue="09:00"
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Grace minutes"
                  name="graceMinutes"
                  initialValue={15}
                >
                  <InputNumber min={0} />
                </Form.Item>

                <Form.Item
                  label="Half-day hours"
                  name="halfDayHours"
                  initialValue={5}
                >
                  <InputNumber min={1} />
                </Form.Item>

                <Button type="primary" htmlType="submit" loading={saving}>
                  Save company
                </Button>
              </Form>
            )}
          </Card>

          <Card title="Create Department">
            <Form
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
                rules={[{ required: true, min: 2 }]}
              >
                <Input placeholder="Department name" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={saving}>
                Add Department
              </Button>
            </Form>

            <div style={{ marginTop: 20 }}>
              {departments.map((dept) => (
                <Tag key={dept._id}>{dept.name}</Tag>
              ))}
            </div>
          </Card>

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
                  "HR account created",
                  () => hrForm.resetFields()
                )
              }
            >
              <Form.Item
                label="Full name"
                name="name"
                rules={[{ required: true, min: 2 }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, type: "email" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Temporary password"
                name="password"
                rules={[{ required: true, min: 8 }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={saving}>
                Create HR
              </Button>
            </Form>
          </Card>

          <Card title="HR Accounts">
            <Table
              rowKey="_id"
              dataSource={hrUsers}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 500 }}
              columns={[
                { title: "Name", dataIndex: "name" },
                { title: "Email", dataIndex: "email" },
                {
                  title: "Status",
                  dataIndex: "isActive",
                  render: (active: boolean) =>
                    active ? "Active" : "Inactive",
                },
              ]}
            />
          </Card>
        </Space>
      )}

      {/* HR DASHBOARD */}
      {user.role === "hr" && (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Title level={3}>HR Dashboard</Title>

          <Card>
            <Text>Total registered employees</Text>
            <Title level={2}>{employees.length}</Title>
          </Card>

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
                label="Full name"
                name="name"
                rules={[{ required: true, min: 2 }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, type: "email" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Employee code"
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
                  placeholder="Select department"
                  options={departments.map((dept) => ({
                    label: dept.name,
                    value: dept._id,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="Designation"
                name="designation"
                rules={[{ required: true, min: 2 }]}
              >
                <Input placeholder="Software Developer" />
              </Form.Item>

              <Form.Item
                label="Joining date"
                name="joiningDate"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item
                label="Monthly basic salary"
                name="basicSalary"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label="Temporary password"
                name="password"
                rules={[{ required: true, min: 8 }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={saving}>
                Register Employee
              </Button>
            </Form>
          </Card>
        </Space>
      )}

      {/* ADMIN + HR EMPLOYEE TABLE */}
      {(user.role === "admin" || user.role === "hr") && (
        <Card title="Employee Directory" style={{ marginTop: 24 }}>
          <Table
            rowKey="_id"
            dataSource={employees}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            columns={[
              { title: "Code", dataIndex: "employeeCode" },
              {
                title: "Name",
                render: (_, record: Employee) => record.user?.name,
              },
              {
                title: "Department",
                render: (_, record: Employee) =>
                  record.department?.name,
              },
              { title: "Designation", dataIndex: "designation" },
              {
                title: "Salary (PKR)",
                dataIndex: "basicSalary",
                render: (value: number | undefined) =>
                  value == null ? "—" : value.toLocaleString(),
              },
              {
                title: "Status",
                dataIndex: "employmentStatus",
              },
            ]}
          />
        </Card>
      )}

      {/* EMPLOYEE DASHBOARD */}
      {user.role === "employee" && (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Title level={3}>Employee Dashboard</Title>

          <Card title="My Profile">
            {myProfile ? (
              <Space direction="vertical">
                <Text strong>{myProfile.user?.name}</Text>
                <Text>Employee Code: {myProfile.employeeCode}</Text>
                <Text>Email: {myProfile.user?.email}</Text>
                <Text>
                  Department: {myProfile.department?.name}
                </Text>
                <Text>Designation: {myProfile.designation}</Text>
                <Text>
                  Joining Date:{" "}
                  {new Date(myProfile.joiningDate).toLocaleDateString()}
                </Text>
                <Tag color="green">{myProfile.employmentStatus}</Tag>
              </Space>
            ) : (
              <Text>Loading employee profile...</Text>
            )}
          </Card>
        </Space>
      )}
    </main>
  );
}
