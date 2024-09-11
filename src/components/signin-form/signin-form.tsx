import { useState, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/providers/auth-provider';
import styles from './signin-form.module.scss';

export function SigninForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const { supabase } = useAuth();

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        setEmail(event.target.value);
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setPassword(event.target.value);
    }

    function toggleFormMode() {
        setIsSignUp((prevState) => !prevState);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setError(null);

        if (isSignUp) {
            await handleSignUp();
        } else {
            await handleSignIn();
        }

        setLoading(false);
    }

    async function handleSignUp() {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            alert(
                'Sign-up successful! Please check your email for confirmation.'
            );
        }
    }

    async function handleSignIn() {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            alert('Sign-in successful!');
        }
    }

    return (
        <form className={styles.menu} onSubmit={handleSubmit}>
            <h2>{isSignUp ? 'Sign up' : 'Sign in'}</h2>

            {error && <p className={styles.error}>{error}</p>}

            <div>
                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                />
            </div>

            <div>
                <label>Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                />
            </div>

            <button type="submit" disabled={loading}>
                {loading
                    ? isSignUp
                        ? 'Signing up...'
                        : 'Signing in...'
                    : isSignUp
                    ? 'Sign Up'
                    : 'Sign In'}
            </button>

            <p>
                {isSignUp
                    ? 'Already have an account?'
                    : "Don't have an account?"}{' '}
                <button type="button" onClick={toggleFormMode}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
            </p>
        </form>
    );
}
