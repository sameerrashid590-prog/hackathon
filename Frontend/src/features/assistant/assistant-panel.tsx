
"use client";

import { useState } from "react";
import {
  App,
  Button,
  Card,
  Input,
  Space,
  Tag,
  Typography,
} from "antd";

import { apiFetch } from "@/lib/api";

type Role = "admin" | "hr" | "employee";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const { Text } = Typography;

export default function AssistantPanel({
  role,
}: {
  role: Role;
}) {
  const { message } = App.useApp();

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text:
        "Hello! I'm your HCM Lite HR Smart Assistant. Ask me about " +
        (role === "employee"
          ? "your attendance or leave requests."
          : "employees, attendance, or leave requests."),
    },
  ]);

  const suggestions =
    role === "employee"
      ? [
          "What's my attendance today?",
          "What's my latest leave status?",
          "How many leaves have I requested?",
          "Show my attendance history",
        ]
      : [
          "How many employees do we have?",
          "Who checked in today?",
          "Who is late today?",
          "How many leaves are pending?",
        ];

  async function sendQuestion(text?: string) {
    const value = (text ?? question).trim();

    if (!value || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text: value },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const result = await apiFetch<{
        success: boolean;
        answer: string;
      }>("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({
          message: value,
        }),
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: result.answer,
        },
      ]);
    } catch (error) {
      const details =
        error instanceof Error
          ? error.message
          : "Assistant unavailable";

      message.error(details);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "Sorry, I couldn't retrieve the data. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title={
        <Space>
          <span>🤖 HR Smart Assistant</span>
          <Tag color="blue">Live Database</Tag>
        </Space>
      }
      style={{ marginTop: 24 }}
    >
      <div
        style={{
          maxHeight: 360,
          minHeight: 190,
          overflowY: "auto",
          padding: 12,
          marginBottom: 20,
          background: "#fafafa",
          borderRadius: 10,
        }}
      >
        <Space
          direction="vertical"
          size="middle"
          style={{ width: "100%" }}
        >
          {messages.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent:
                  item.role === "user"
                    ? "flex-end"
                    : "flex-start",
              }}
            >
              <div
                style={{
                  padding: "12px 15px",
                  maxWidth: "90%",
                  borderRadius: 12,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  background:
                    item.role === "user"
                      ? "#1677ff"
                      : "#fff",
                  color:
                    item.role === "user"
                      ? "#fff"
                      : "#222",
                  border:
                    item.role === "user"
                      ? "none"
                      : "1px solid #eee",
                }}
              >
                {item.text}
              </div>
            </div>
          ))}

          {loading && (
            <Text type="secondary">
              Checking HR records...
            </Text>
          )}
        </Space>
      </div>

      <Space
        wrap
        style={{
          width: "100%",
          marginBottom: 16,
        }}
      >
        {suggestions.map((item) => (
          <Button
            key={item}
            size="small"
            disabled={loading}
            onClick={() => void sendQuestion(item)}
          >
            {item}
          </Button>
        ))}
      </Space>

      <Space.Compact style={{ width: "100%" }}>
        <Input
          value={question}
          maxLength={500}
          placeholder="Ask your HR question..."
          disabled={loading}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          onPressEnter={() => void sendQuestion()}
        />

        <Button
          type="primary"
          loading={loading}
          disabled={!question.trim()}
          onClick={() => void sendQuestion()}
        >
          Send
        </Button>
      </Space.Compact>

      <Text
        type="secondary"
        style={{
          display: "block",
          marginTop: 12,
          fontSize: 12,
        }}
      >
        Answers supported HR questions using real company records.
        Access is restricted by your account role.
      </Text>
    </Card>
  );
}
