import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/shared/components/Toast";
import { InlineError } from "@/components/alerts/InlineError";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  onClose: () => void;
  onLogin: () => void;
}

const AUTH_ACCENT = "#A17436";
const fieldClass =
  "h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#A17436]";

type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  digit: boolean;
  special: boolean;
};

function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 12,
    uppercase: /[A-ZА-ЯӘІҢҒҮҰҚӨҺ]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  };
}

export const LoginForm = ({ onClose, onLogin }: LoginFormProps) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmailOrUsername, setResetEmailOrUsername] = useState("");

  const [registerPasswordError, setRegisterPasswordError] = useState("");
  const [registerConfirmPasswordError, setRegisterConfirmPasswordError] = useState("");
  const [termsError, setTermsError] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");

  const passwordChecks = getPasswordChecks(registerPassword);
  const passwordValid = Object.values(passwordChecks).every(Boolean);
  const showPasswordHints = passwordFocused || Boolean(registerPasswordError);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (loginEmail === "admin" && loginPassword === "admin") {
      onLogin();
      onClose();
    } else {
      showToast("Неверные учетные данные. Используйте admin/admin", "error");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    setRegisterPasswordError("");
    setRegisterConfirmPasswordError("");
    setTermsError("");

    let hasError = false;

    if (!passwordValid) {
      setRegisterPasswordError(t("auth.passwordInvalid"));
      hasError = true;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterConfirmPasswordError(t("auth.passwordsMismatch"));
      hasError = true;
    }

    if (!acceptedTerms) {
      setTermsError(t("auth.termsRequired"));
      hasError = true;
    }

    if (hasError) return;

    showToast("Регистрация успешна! Теперь войдите с admin/admin", "success");
    setLoginEmail("admin");
    setActiveTab("login");
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();

    setResetPasswordError("");

    if (!resetEmailOrUsername.trim()) {
      setResetPasswordError("Пожалуйста, введите email или имя пользователя");
      return;
    }

    showToast(`Инструкции по восстановлению пароля отправлены на ${resetEmailOrUsername}`, "success");
    setShowResetPassword(false);
    setResetEmailOrUsername("");
    setResetPasswordError("");
  };

  if (showResetPassword) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-border shadow-card my-8 rounded-2xl">
            <CardHeader className="sticky top-0 bg-white z-10 border-b pb-6 rounded-t-2xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetEmailOrUsername("");
                }}
                className="absolute right-2 top-2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl sm:text-2xl font-bold text-center pr-8">
                {t("auth.resetPassword.title")}
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground text-sm mt-1">
                {t("auth.resetPassword.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email-username">{t("auth.resetPassword.emailOrUsername")}</Label>
                  <Input
                    id="reset-email-username"
                    type="text"
                    value={resetEmailOrUsername}
                    onChange={(e) => {
                      setResetEmailOrUsername(e.target.value);
                      if (resetPasswordError) setResetPasswordError("");
                    }}
                    placeholder={t("auth.resetPassword.emailOrUsername")}
                    required
                    className={cn(fieldClass, resetPasswordError && "border-destructive")}
                  />
                  {resetPasswordError && <InlineError message={resetPasswordError} />}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowResetPassword(false);
                      setResetEmailOrUsername("");
                    }}
                  >
                    {t("auth.resetPassword.goBack")}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-white hover:opacity-90"
                    style={{ background: AUTH_ACCENT }}
                  >
                    {t("auth.resetPassword.submit")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const subtitle =
    activeTab === "register" ? t("auth.registerSubtitle") : t("auth.subtitle");

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-[440px] bg-white border-border shadow-card my-8 rounded-2xl">
          <CardHeader className="relative pb-4 pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-2 top-2 h-8 w-8 p-0 text-slate-500"
            >
              <X className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl sm:text-[28px] font-bold text-center tracking-tight text-slate-900">
              {t("auth.title")}
            </CardTitle>
            <CardDescription className="text-center text-slate-500 text-sm mt-1">
              {subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-11 p-1 rounded-full bg-slate-100">
                <TabsTrigger
                  value="login"
                  className="w-full h-full rounded-full text-sm leading-none data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {t("auth.loginTab")}
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="w-full h-full rounded-full text-sm leading-none data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {t("auth.registerTab")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold text-slate-900">
                      {t("auth.username")}
                    </Label>
                    <Input
                      id="login-email"
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-semibold text-slate-900">
                      {t("auth.password")}
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className={fieldClass}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 text-white hover:opacity-90"
                    style={{ background: AUTH_ACCENT }}
                  >
                    {t("auth.loginButton")}
                  </Button>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm"
                      style={{ color: AUTH_ACCENT }}
                      onClick={() => setShowResetPassword(true)}
                    >
                      {t("auth.forgotPassword")}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-sm font-semibold text-slate-900">
                      {t("auth.username")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="register-username"
                      type="text"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      placeholder={t("auth.usernamePlaceholder")}
                      required
                      className={fieldClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-semibold text-slate-900">
                      {t("auth.email")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder={t("auth.emailPlaceholder")}
                      required
                      className={fieldClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="register-first-name" className="text-sm font-semibold text-slate-900">
                        {t("auth.firstName")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="register-first-name"
                        type="text"
                        value={registerFirstName}
                        onChange={(e) => setRegisterFirstName(e.target.value)}
                        placeholder={t("auth.firstNamePlaceholder")}
                        required
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-last-name" className="text-sm font-semibold text-slate-900">
                        {t("auth.lastName")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="register-last-name"
                        type="text"
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        placeholder={t("auth.lastNamePlaceholder")}
                        required
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-semibold text-slate-900">
                      {t("auth.password")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerPassword}
                        onChange={(e) => {
                          setRegisterPassword(e.target.value);
                          if (registerPasswordError) setRegisterPasswordError("");
                        }}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        placeholder={t("auth.passwordPlaceholder")}
                        required
                        className={cn(fieldClass, "pr-10", registerPasswordError && "border-destructive")}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowRegisterPassword((v) => !v)}
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {showPasswordHints && (
                      <div className="text-xs space-y-0.5 pt-0.5">
                        <p className="text-slate-400">{t("auth.passwordRulesTitle")}</p>
                        {(
                          [
                            ["minLength", "auth.passwordRuleLength"],
                            ["uppercase", "auth.passwordRuleUppercase"],
                            ["digit", "auth.passwordRuleDigit"],
                            ["special", "auth.passwordRuleSpecial"],
                          ] as const
                        ).map(([key, labelKey]) => (
                          <p
                            key={key}
                            style={{
                              color: passwordChecks[key] ? "#059669" : "#A67C72",
                            }}
                          >
                            {t(labelKey)}
                          </p>
                        ))}
                      </div>
                    )}
                    {registerPasswordError && <InlineError message={registerPasswordError} />}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="register-confirm-password"
                      className="text-sm font-semibold text-slate-900"
                    >
                      {t("auth.confirmPassword")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={registerConfirmPassword}
                        onChange={(e) => {
                          setRegisterConfirmPassword(e.target.value);
                          if (registerConfirmPasswordError) setRegisterConfirmPasswordError("");
                        }}
                        placeholder={t("auth.confirmPasswordPlaceholder")}
                        required
                        className={cn(
                          fieldClass,
                          "pr-10",
                          registerConfirmPasswordError && "border-destructive"
                        )}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerConfirmPasswordError && (
                      <InlineError message={registerConfirmPasswordError} />
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          if (termsError) setTermsError("");
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#A17436]"
                      />
                      <span className="text-xs leading-relaxed text-slate-600">
                        {t("auth.termsPrefix")}{" "}
                        <a href="#" className="underline" style={{ color: AUTH_ACCENT }}>
                          {t("auth.termsAgreement")}
                        </a>{" "}
                        {t("auth.termsAnd")}{" "}
                        <a href="#" className="underline" style={{ color: AUTH_ACCENT }}>
                          {t("auth.termsPrivacy")}
                        </a>
                      </span>
                    </label>
                    {termsError && <InlineError message={termsError} />}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-white hover:opacity-90"
                    style={{ background: AUTH_ACCENT }}
                  >
                    {t("auth.registerButton")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
