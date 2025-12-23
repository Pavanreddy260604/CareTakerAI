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
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleGoogleResponse = async (response: any) => {
        try {
            await api.googleLogin(response.credential);
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
                    { theme: "filled_black", size: "large", text: "continue_with", shape: "rectangular", width: window.innerWidth < 400 ? 280 : 350 }
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
        <div className="min-h-screen bg-background scanline flex items-center justify-center p-6">
            <Card className="w-full max-w-md border-primary/30 bg-card/50 backdrop-blur">
                <CardHeader className="text-center">
                    <div className="font-mono text-xs text-muted-foreground mb-2">[SYSTEM]</div>
                    <CardTitle className="text-2xl font-mono tracking-wider text-primary">
                        CARETAKER AI
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                        {isLogin ? "AUTHENTICATE TO PROCEED" : "REGISTER NEW USER"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-muted-foreground">NAME</label>
                                <Input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="font-mono bg-background/50 border-primary/30"
                                    placeholder="Enter your name"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-muted-foreground">EMAIL</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="font-mono bg-background/50 border-primary/30"
                                placeholder="user@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-muted-foreground">PASSWORD</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="font-mono bg-background/50 border-primary/30"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex justify-center my-4"></div>

                        <Button
                            type="submit"
                            className="w-full font-mono tracking-wider"
                            disabled={loading}
                        >
                            {loading ? "PROCESSING..." : isLogin ? "LOGIN" : "REGISTER"}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full font-mono text-xs"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? "CREATE NEW ACCOUNT" : "ALREADY HAVE AN ACCOUNT"}
                        </Button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-muted"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground font-mono">Or continue with</span>
                            </div>
                        </div>

                        <div id="googleBtn" className="w-full flex justify-center"></div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
