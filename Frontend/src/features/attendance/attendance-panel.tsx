
"use client";

import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Space, Table, Tag, Typography } from "antd";
import { apiFetch } from "@/lib/api";

type Role = "admin" | "hr" | "employee";

type RecordItem = {
  _id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  workedMinutes: number;
  status: "present" | "late" | "half-day";
  employee?: {
    employeeCode: string;
    user?: { name: string };
    department?: { name: string };
  };
};

function displayTime(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AttendancePanel({
  role,
}: {
  role: Role;
}) {
  const { message } = App.useApp();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isEmployee = role === "employee";

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await apiFetch<{ attendance: RecordItem[] }>(
        isEmployee ? "/attendance/me" : "/attendance"
      );

      setRecords(result.attendance);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Attendance unavailable"
      );
    } finally {
      setLoading(false);
    }
  }, [isEmployee, message]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(type: "check-in" | "check-out") {
    setActionLoading(true);

    try {
      const result = await apiFetch<{ message: string }>(
        `/attendance/${type}`,
        { method: "POST" }
      );

      message.success(result.message);
      await load();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Attendance failed"
      );
    } finally {
      setActionLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayRecord = records.find((item) => item.date === today);

  return (
    <Card
      title={isEmployee ? "My Attendance" : "Attendance Records"}
      style={{ marginTop: 24 }}
    >
      {isEmployee && (
        <Space style={{ marginBottom: 20 }} wrap>
          <Button
            type="primary"
            loading={actionLoading}
            disabled={Boolean(todayRecord)}
            onClick={() => action("check-in")}
          >
            Check In
          </Button>

          <Button
            loading={actionLoading}
            disabled={!todayRecord || Boolean(todayRecord.checkOut)}
            onClick={() => action("check-out")}
          >
            Check Out
          </Button>

          <Tag color={todayRecord ? "green" : "default"}>
            {todayRecord
              ? todayRecord.checkOut
                ? "Completed today"
                : "Checked in"
              : "Not checked in"}
          </Tag>
        </Space>
      )}

      <Table<RecordItem>
        rowKey="_id"
        loading={loading}
        dataSource={records}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 700 }}
        columns={[
          ...(isEmployee
            ? []
            : [
                {
                  title: "Employee",
                  key: "employee",
                  render: (_: unknown, record: RecordItem) =>
                    record.employee?.user?.name || "Unknown",
                },
                {
                  title: "Code",
                  key: "code",
                  render: (_: unknown, record: RecordItem) =>
                    record.employee?.employeeCode || "—",
                },
              ]),
          { title: "Date", dataIndex: "date" },
          {
            title: "Check In",
            dataIndex: "checkIn",
            render: (value: string) => displayTime(value),
          },
          {
            title: "Check Out",
            dataIndex: "checkOut",
            render: (value: string | null) => displayTime(value),
          },
          {
            title: "Hours",
            dataIndex: "workedMinutes",
            render: (value: number) =>
              value ? (value / 60).toFixed(2) : "—",
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => (
              <Tag color={status === "present" ? "green" : "orange"}>
                {status}
              </Tag>
            ),
          },
        ]}
      />
      <Typography.Text type="secondary">
        Times shown in Pakistan Standard Time (PKT).
      </Typography.Text>
    </Card>
  );
}
