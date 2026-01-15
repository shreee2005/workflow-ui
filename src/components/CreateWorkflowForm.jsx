// src/components/CreateWorkflowForm.jsx
import { useState } from "react";

export function CreateWorkflowForm({ onCreate }) {
    const [name, setName] = useState("");
    const [spec, setSpec] = useState('{"steps":[{"type":"LOG","message":"hello"}]}');
    const [active, setActive] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            // basic JSON validation
            JSON.parse(spec);
            await onCreate({ name, spec, active });
            setName("");
            setSpec('{"steps":[{"type":"LOG","message":"hello"}]}');
            setActive(false);
        } catch (err) {
            setError("Invalid JSON in spec or failed to create workflow");
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
            <h2>Create Workflow</h2>

            {error && <p style={{ color: "red" }}>{error}</p>}

            <div style={{ marginBottom: "0.5rem" }}>
                <label>
                    Name:
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{ marginLeft: "0.5rem", width: "250px" }}
                    />
                </label>
            </div>

            <div style={{ marginBottom: "0.5rem" }}>
                <label>
                    Spec (JSON):
                    <br />
                    <textarea
                        value={spec}
                        onChange={(e) => setSpec(e.target.value)}
                        rows={6}
                        cols={60}
                        required
                    />
                </label>
            </div>

            <div style={{ marginBottom: "0.5rem" }}>
                <label>
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                    />{" "}
                    Active
                </label>
            </div>

            <button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Workflow"}
            </button>
        </form>
    );
}
