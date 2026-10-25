
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";

import { apiFetch } from "@/lib/api";

type Role = "admin" | "hr" | "employee";

type LeaveStatus = "pending" | "approved" | "rejected";

type LeaveRecord = {
  _id: string;
  leaveType: "annual" | "sick" | "casual" | "unpaid";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  reviewNote?: string;
  reviewedBy?: {
    name: string;
  } | null;
  employee?: {
    employeeCode: string;
    user?: {
      name: string;
      email: string;
    };
    department?: {
      name: string;
    };
  };
};

type LeaveFormValues = {
  leaveType: LeaveRecord["leaveType"];
  startDate: string;
  endDate: string;
  reason: string;
};

const TYPE_LABELS: Record<LeaveRecord["leaveType"], string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  casual: "Casual Leave",
  unpaid: "Unpaid Leave",
};

function statusColor(status: LeaveStatus) {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "orange";
}

export default function LeavePanel({
  role,
}: {
  role: Role;
}) {
  const { message } = App.useApp();

  const [form] = Form.useForm<LeaveFormValues>();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionId, setDecisionId] = useState<string | null>(
    null
  );

  const isEmployee = role === "employee";

  const loadLeaves = useCallback(async () => {
    setLoading(true);

    try {
      const response = await apiFetch<{
        success: boolean;
        leaves: LeaveRecord[];
      }>(isEmployee ? "/leaves/me" : "/leaves");

      setLeaves(response.leaves ?? []);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Could not load leave requests"
      );
    } finally {
      setLoading(false);
    }
  }, [isEmployee, message]);

  useEffect(() => {
    void loadLeaves();
  }, [loadLeaves]);

  async function applyForLeave(values: LeaveFormValues) {
    if (values.endDate < values.startDate) {
      message.error("End date cannot be before start date");
      return;
    }

    setSaving(true);

    try {
      const response = await apiFetch<{
        message: string;
      }>("/leaves", {
        method: "POST",
        body: JSON.stringify(values),
      });

      message.success(response.message);
      form.resetFields();
      await loadLeaves();
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Could not submit leave request"
      );
    } finally {
      setSaving(false);
    }
  }

  async function decide(
    id: string,
    status: "approved" | "rejected"
  ) {
    setDecisionId(id);

    try {
      const response = await apiFetch<{
        message: string;
      }>(`/leaves/${id}/decision`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      });

      message.success(response.message);
      await loadLeaves();
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Could not update leave request"
      );
    } finally {
      setDecisionId(null);
    }
  }

  const pendingCount = leaves.filter(
    (leave) => leave.status === "pending"
  ).length;

  return (
    <div style={{ marginTop: 24 }}>
      {isEmployee && (
        <Card
          title="Apply for Leave"
          style={{ marginBottom: 24 }}
        >
          <Typography.Paragraph type="secondary">
            Submit your leave request for HR review.
          </Typography.Paragraph>

          <Form<LeaveFormValues>
            form={form}
            layout="vertical"
            onFinish={applyForLeave}
          >
            <Form.Item
              name="leaveType"
              label="Leave Type"
              rules={[
                {
                  required: true,
                  message: "Select a leave type",
                },
              ]}
            >
              <Select
                placeholder="Select leave type"
                options={[
                  { label: "Annual Leave", value: "annual" },
                  { label: "Sick Leave", value: "sick" },
                  { label: "Casual Leave", value: "casual" },
                  { label: "Unpaid Leave", value: "unpaid" },
                ]}
              />
            </Form.Item>

            <Space wrap style={{ width: "100%" }}>
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item
                name="endDate"
                label="End Date"
                rules={[{ required: true }]}
              >
                <Input type="date" />
              </Form.Item>
            </Space>

            <Form.Item
              name="reason"
              label="Reason"
              rules={[
                {
                  required: true,
                  message: "Enter a reason",
                },
                {
                  min: 5,
                  message: "Use at least 5 characters",
                },
                {
                  max: 1000,
                  message: "Maximum 1000 characters",
                },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Explain why you need leave..."
                showCount
                maxLength={1000}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
            >
              Submit Leave Request
            </Button>
          </Form>
        </Card>
      )}

      <Card
        title={
          isEmployee
            ? "My Leave Requests"
            : "Leave Management"
        }
        extra={
          <Space>
            <Tag color="orange">
              {pendingCount} pending
            </Tag>
            <Button
              size="small"
              onClick={() => void loadLeaves()}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table<LeaveRecord>
          rowKey="_id"
          loading={loading}
          dataSource={leaves}
          scroll={{ x: 1050 }}
          pagination={{ pageSize: 8 }}
          expandable={{
            expandedRowRender: (record) => (
              <Space direction="vertical">
                <Typography.Text>
                  <strong>Reason:</strong> {record.reason}
                </Typography.Text>

                {record.reviewNote && (
                  <Typography.Text>
                    <strong>Review Note:</strong>{" "}
                    {record.reviewNote}
                  </Typography.Text>
                )}

                {record.reviewedBy?.name && (
                  <Typography.Text type="secondary">
                    Reviewed by: {record.reviewedBy.name}
                  </Typography.Text>
                )}
              </Space>
            ),
          }}
          columns={[
            ...(!isEmployee
              ? [
                  {
                    title: "Employee",
                    key: "employee",
                    render: (
                      _: unknown,
                      record: LeaveRecord
                    ) => (
                      <div>
                        <div>
                          {record.employee?.user?.name ||
                            "Unknown"}
                        </div>
                        <Typography.Text type="secondary">
                          {record.employee?.employeeCode ||
                            "—"}
                        </Typography.Text>
                      </div>
                    ),
                  },
                  {
                    title: "Department",
                    key: "department",
                    render: (
                      _: unknown,
                      record: LeaveRecord
                    ) =>
                      record.employee?.department?.name ||
                      "—",
                  },
                ]
              : []),
            {
              title: "Leave Type",
              dataIndex: "leaveType",
              render: (value: LeaveRecord["leaveType"]) =>
                TYPE_LABELS[value] || value,
            },
            {
              title: "Start Date",
              dataIndex: "startDate",
            },
            {
              title: "End Date",
              dataIndex: "endDate",
            },
            {
              title: "Days",
              dataIndex: "totalDays",
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (status: LeaveStatus) => (
                <Tag color={statusColor(status)}>
                  {status.toUpperCase()}
                </Tag>
              ),
            },
            ...(!isEmployee
              ? [
                  {
                    title: "Actions",
                    key: "actions",
                    render: (
                      _: unknown,
                      record: LeaveRecord
                    ) =>
                      record.status === "pending" ? (
                        <Space>
                          <Popconfirm
                            title="Approve leave?"
                            description="Approve this employee's request?"
                            onConfirm={() =>
                              void decide(
                                record._id,
                                "approved"
                              )
                            }
                            okText="Approve"
                          >
                            <Button
                              type="primary"
                              size="small"
                              loading={
                                decisionId === record._id
                              }
                            >
                              Approve
                            </Button>
                          </Popconfirm>

                          <Popconfirm
                            title="Reject leave?"
                            description="Reject this employee's request?"
                            onConfirm={() =>
                              void decide(
                                record._id,
                                "rejected"
                              )
                            }
                            okText="Reject"
                            okButtonProps={{
                              danger: true,
                            }}
                          >
                            <Button
                              danger
                              size="small"
                              loading={
                                decisionId === record._id
                              }
                            >
                              Reject
                            </Button>
                          </Popconfirm>
                        </Space>
                      ) : (
                        <Typography.Text type="secondary">
                          Reviewed
                        </Typography.Text>
                      ),
                  },
                ]
              : []),
          ]}
        />

        <Typography.Text type="secondary">
          Leave duration is counted in calendar days.
          Expand a row to see the reason and review details.
        </Typography.Text>
      </Card>
    </div>
  );
}
