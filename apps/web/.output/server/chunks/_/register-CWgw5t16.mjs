import { jsx, jsxs } from 'react/jsx-runtime';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { f as useAuth } from './router-6_mKVCnu.mjs';
import '@tanstack/react-router-devtools';
import '@tanstack/react-query-devtools';
import 'lucide-react';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-separator';
import '@tanstack/react-query';
import 'axios';
import 'next-themes';
import 'sonner';

const RegisterRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1)
});
function RegisterPage() {
  const {
    signUp
  } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const onSubmit = async (e) => {
    var _a;
    e.preventDefault();
    setError(null);
    const parsed = RegisterRequestSchema.safeParse({
      name,
      email,
      password
    });
    if (!parsed.success) {
      setError(((_a = parsed.error.issues[0]) == null ? void 0 : _a.message) || "Invalid input");
      return;
    }
    try {
      setLoading(true);
      await signUp(name, email, password);
      navigate({
        to: "/projects"
      });
    } catch (err) {
      if (err && typeof err === "object" && "error" in err && typeof err.error === "string") {
        setError(err.error);
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 p-4", children: /* @__PURE__ */ jsxs("form", { onSubmit, className: "w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: "Create account" }),
    error && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded", children: error }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium", htmlFor: "register-name", children: "Name" }),
      /* @__PURE__ */ jsx("input", { type: "text", className: "w-full border rounded p-2", value: name, onChange: (e) => setName(e.target.value), placeholder: "Ada Lovelace", id: "register-name" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium", htmlFor: "register-email", children: "Email" }),
      /* @__PURE__ */ jsx("input", { type: "email", className: "w-full border rounded p-2", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", id: "register-email" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium", htmlFor: "register-password", children: "Password" }),
      /* @__PURE__ */ jsx("input", { type: "password", className: "w-full border rounded p-2", value: password, onChange: (e) => setPassword(e.target.value), id: "register-password" })
    ] }),
    /* @__PURE__ */ jsx("button", { type: "submit", className: "w-full bg-blue-600 text-white rounded p-2 disabled:opacity-50", disabled: loading, children: loading ? "Creating\u2026" : "Create account" })
  ] }) });
}

export { RegisterPage as component };
//# sourceMappingURL=register-CWgw5t16.mjs.map
