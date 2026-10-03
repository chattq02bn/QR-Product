'use client';

import { useState } from 'react';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/client';

type FormValues = { username: string; password: string };

export default function LoginForm() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: FormValues) => {
    setLoading(true);
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: values.username, password: values.password }),
      });
      message.success('Đăng nhập thành công');
      window.location.assign('/admin');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-page__card" title="Đăng nhập quản trị">
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          Nhập tài khoản và mật khẩu để quản lý sản phẩm và mã QR.
        </Typography.Paragraph>
        <Form<FormValues> layout="vertical" onFinish={(values) => void handleFinish(values)}>
          <Form.Item
            name="username"
            label="Tài khoản"
            rules={[{ required: true, message: 'Vui lòng nhập tài khoản' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Tài khoản quản trị"
              size="large"
              autoFocus
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu quản trị"
              size="large"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            icon={<LoginOutlined />}
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
