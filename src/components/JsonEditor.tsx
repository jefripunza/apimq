import Editor from "@monaco-editor/react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
  readOnly?: boolean;
}

export default function JsonEditor({
  value,
  onChange,
  height = 300,
  readOnly = false,
}: JsonEditorProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-dark-600/40">
      <Editor
        height={height}
        defaultLanguage="json"
        value={value}
        onChange={(val) => onChange(val ?? "{}")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "ui-monospace, monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          wordWrap: "on",
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
