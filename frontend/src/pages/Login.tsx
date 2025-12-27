import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Check for session expired on mount
    useEffect(() => {
        const expired = sessionStorage.getItem('session_expired');
        if (expired === 'true') {
            setSessionExpired(true);
            // Clear the flag so it doesn't show again on refresh
            sessionStorage.removeItem('session_expired');
        }
    }, []);

    const handleGoogleResponse = async (response: any) => {
        try {
            await api.googleLogin(response.credential);
            setSessionExpired(false);
            toast({ title: "SYSTEM ACCESS GRANTED", description: "Google Authentication Verified." });
            navigate("/");
        } catch (error: any) {
            toast({ title: "ACCESS DENIED", description: error.message, variant: "destructive" });
        }
    };

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = () => {
            if ((window as any).google) {
                (window as any).google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
                    callback: handleGoogleResponse
                });
                (window as any).google.accounts.id.renderButton(
                    document.getElementById("googleBtn"),
                    {
                        theme: "filled_black",
                        size: "large",
                        text: "continue_with",
                        shape: "rectangular",
                        width: Math.min(window.innerWidth - 80, 350)
                    }
                );
            }
        };
        document.body.appendChild(script);
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);

        try {
            if (isLogin) {
                await api.login(email, password);
                toast({ title: "SYSTEM ACCESS GRANTED", description: "Welcome back." });
            } else {
                await api.register(name, email, password);
                toast({ title: "REGISTRATION COMPLETE", description: "You are now in the system." });
            }
            setSessionExpired(false);
            navigate("/");
        } catch (error: any) {
            toast({
                title: "ACCESS DENIED",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background scanline flex items-center justify-center p-4 safe-area-bottom">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md border-primary/30 bg-card/50 backdrop-blur-xl relative z-10 rounded-2xl">
                <CardHeader className="text-center pb-4">
                    {/* Session Expired Alert */}
                    {sessionExpired && (
                        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl">
                            <div className="flex items-center justify-center gap-2 text-yellow-500">
                                <span className="text-xl">⏰</span>
                                <div>
                                    <p className="font-mono font-bold text-sm">SESSION EXPIRED</p>
                                    <p className="text-xs text-yellow-500/80">Please log in again to continue</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <span className="text-3xl">🧠</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground mb-2 tracking-widest uppercase">[SYSTEM]</div>
                    <CardTitle className="text-xl sm:text-2xl font-mono tracking-wider text-primary">
                        CARETAKER AI
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-2">
                        {isLogin ? "AUTHENTICATE TO PROCEED" : "REGISTER NEW USER"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="form-label">NAME</label>
                                <Input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="font-mono bg-background/50 border-primary/30 h-12 rounded-xl"
                                    placeholder="Enter your name"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="form-label">EMAIL</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="font-mono bg-background/50 border-primary/30 h-12 rounded-xl"
                                placeholder="user@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="form-label">PASSWORD</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="font-mono bg-background/50 border-primary/30 h-12 rounded-xl"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full font-mono tracking-wider h-12 rounded-xl text-sm"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    PROCESSING...
                                </span>
                            ) : isLogin ? "LOGIN" : "REGISTER"}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full font-mono text-xs h-10"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? "CREATE NEW ACCOUNT" : "ALREADY HAVE AN ACCOUNT"}
                        </Button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-muted"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-4 text-muted-foreground font-mono">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div id="googleBtn" className="w-full flex justify-center"></div>
                    </form>
                </CardContent>
            </Card>

            {/* Version footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-[10px] text-muted-foreground/50 font-mono">
                    v1.0.0 | Secure Connection
                </p>
            </div>
        </div>
    );
};

export default Login;
