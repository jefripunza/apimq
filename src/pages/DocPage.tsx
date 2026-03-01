import { useState } from "react";
import {
  LayoutDashboard,
  Group,
  FileText,
  Shield,
  Key,
  Settings,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface DocSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: DocItem[];
}

interface DocItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: DocSection[] = [
  {
    id: "intro",
    label: "Introduction",
    icon: LayoutDashboard,
    items: [
      {
        id: "what-is-apimq",
        title: "What is ApiMQ?",
        content: (
          <div className="space-y-4">
            <p>
              <strong>ApiMQ</strong> is a lightweight, self-hosted HTTP message
              queue manager. It lets you queue outgoing HTTP requests and
              process them reliably with configurable concurrency, retry logic,
              delays, and scheduled delivery.
            </p>
            <h3>Key Features</h3>
            <ul>
              <li>
                <strong>Queue-based delivery</strong> — messages are stored and
                dispatched to your configured origin URL.
              </li>
              <li>
                <strong>Scheduled sending</strong> — configure a queue to send
                messages at a fixed daily time (e.g. 08:00 every day).
              </li>
              <li>
                <strong>Batch &amp; delay control</strong> — send N messages per
                interval with fixed or random delays between them.
              </li>
              <li>
                <strong>IP/Domain whitelist</strong> — restrict which callers
                can submit messages to the public <code>/queue</code> endpoint.
              </li>
              <li>
                <strong>API Key auth</strong> — require a valid key via
                <code>X-Api-Key</code> header or <code>?api_key</code> query
                param.
              </li>
              <li>
                <strong>Real-time dashboard</strong> — Socket.IO-powered live
                stats and queue throughput charts.
              </li>
            </ul>
            <h3>Quick Start</h3>
            <CodeBlock>{`# Build and run
go run main.go

# Access the dashboard
open http://localhost:3000/app/dashboard

# Submit a message to a queue (public endpoint)
curl -X POST http://localhost:3000/queue \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: apimq_<your-key>" \\
  -d '{
    "key": "my-queue",
    "method": "POST",
    "body": "{\\"event\\": \\"user.signed_up\\", \\"id\\": 42}"
  }'`}</CodeBlock>
          </div>
        ),
      },
      {
        id: "architecture",
        title: "Architecture",
        content: (
          <div className="space-y-4">
            <p>
              ApiMQ is a single Go binary that embeds the React frontend in the
              compiled binary via <code>embed.FS</code>.
            </p>
            <h3>Components</h3>
            <table>
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Technology</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>HTTP server</td>
                  <td>Go Fiber v2</td>
                  <td>REST API, static file serving</td>
                </tr>
                <tr>
                  <td>Realtime</td>
                  <td>Socket.IO v4</td>
                  <td>Live stats push to dashboard</td>
                </tr>
                <tr>
                  <td>Database</td>
                  <td>SQLite + GORM</td>
                  <td>Persistent queue &amp; message storage</td>
                </tr>
                <tr>
                  <td>Worker</td>
                  <td>Go goroutines</td>
                  <td>Per-queue HTTP dispatch workers</td>
                </tr>
                <tr>
                  <td>Frontend</td>
                  <td>React + Vite + Tailwind</td>
                  <td>Admin dashboard UI</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      {
        id: "dashboard-overview",
        title: "Overview",
        content: (
          <div className="space-y-4">
            <p>
              The Dashboard page gives a real-time overview of all queues and
              message processing activity.
            </p>
            <h3>Stat Cards</h3>
            <table>
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Queues</td>
                  <td>Number of configured queues.</td>
                </tr>
                <tr>
                  <td>Total Messages</td>
                  <td>All messages across all queues and statuses.</td>
                </tr>
                <tr>
                  <td>Completed</td>
                  <td>Messages successfully dispatched.</td>
                </tr>
                <tr>
                  <td>Pending</td>
                  <td>Messages ready to be processed next.</td>
                </tr>
                <tr>
                  <td>Timing</td>
                  <td>Messages waiting for their scheduled send time.</td>
                </tr>
                <tr>
                  <td>Failed</td>
                  <td>Messages that failed and have not been acknowledged.</td>
                </tr>
              </tbody>
            </table>
            <h3>Live Updates</h3>
            <p>
              Stats are pushed every second via the Socket.IO{" "}
              <code>live_data</code> room. The frontend joins this room on mount
              and updates the cards without polling.
            </p>
            <h3>Queue Throughput Chart</h3>
            <p>
              A live line chart shows one line per queue, plotting message
              throughput over the last 60 seconds.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: "queues",
    label: "Queues",
    icon: Group,
    items: [
      {
        id: "queues-overview",
        title: "Queue Overview",
        content: (
          <div className="space-y-4">
            <p>
              The Queues page lists all configured queues with their current
              message count, throughput, and error status.
            </p>
            <h3>Queue Card Actions</h3>
            <ul>
              <li>
                <strong>Enable/Disable toggle</strong> — pause or resume a queue
                worker without deleting it.
              </li>
              <li>
                <strong>Test message (⌨ icon)</strong> — send one or more test
                messages directly from the UI with a JSON editor and optional
                API key selection.
              </li>
              <li>
                <strong>Configure (⚙ icon)</strong> — open the queue setup page.
              </li>
              <li>
                <strong>Error count</strong> — click to open the failed messages
                drawer.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "queues-create",
        title: "Creating a Queue",
        content: (
          <div className="space-y-4">
            <p>
              Navigate to <strong>Queues → + New Queue</strong> to open the
              setup form.
            </p>
            <h3>Required Fields</h3>
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Name</td>
                  <td>Human-readable label shown in the UI.</td>
                </tr>
                <tr>
                  <td>Key</td>
                  <td>
                    Unique slug used when submitting messages (e.g.{" "}
                    <code>my-queue</code>).
                  </td>
                </tr>
                <tr>
                  <td>Origin URL</td>
                  <td>
                    The HTTP endpoint ApiMQ will forward messages to (e.g.{" "}
                    <code>https://api.example.com/webhook</code>).
                  </td>
                </tr>
              </tbody>
            </table>
            <h3>Optional Fields</h3>
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Batch Count</td>
                  <td>1</td>
                  <td>Number of messages sent per dispatch cycle.</td>
                </tr>
                <tr>
                  <td>Timeout (s)</td>
                  <td>30</td>
                  <td>HTTP request timeout in seconds.</td>
                </tr>
                <tr>
                  <td>Send Now</td>
                  <td>true</td>
                  <td>If disabled, messages wait until the scheduled time.</td>
                </tr>
                <tr>
                  <td>Send Later Time</td>
                  <td>—</td>
                  <td>
                    Daily time (HH:mm) at which messages are promoted to
                    pending. Only applies when Send Now is off.
                  </td>
                </tr>
                <tr>
                  <td>Use Delay</td>
                  <td>false</td>
                  <td>Adds a fixed or random delay between each message.</td>
                </tr>
                <tr>
                  <td>Delay (s)</td>
                  <td>0</td>
                  <td>Fixed seconds between messages.</td>
                </tr>
                <tr>
                  <td>Random Delay</td>
                  <td>false</td>
                  <td>
                    Randomize delay between <em>Delay Start</em> and{" "}
                    <em>Delay End</em> seconds.
                  </td>
                </tr>
                <tr>
                  <td>Headers</td>
                  <td>[]</td>
                  <td>Default HTTP headers added to every outgoing request.</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: "queues-submit",
        title: "Submitting Messages",
        content: (
          <div className="space-y-4">
            <p>
              Submit messages to the public <code>POST /queue</code> endpoint.
              Authentication is via API Key (if configured) and/or IP/domain
              whitelist.
            </p>
            <h3>Request Payload</h3>
            <CodeBlock>{`POST /queue
Content-Type: application/json
X-Api-Key: apimq_<your-key>   // optional but required if keys exist

{
  "key": "my-queue",           // queue key (or use queue_id)
  "queue_id": "...",           // alternatively the queue UUID
  "method": "POST",            // HTTP method to use when forwarding
  "query": "{}",               // optional query string object (JSON string)
  "body": "{'user': 1}",      // message body (JSON string)
  "headers": "{}"              // optional extra headers (JSON string)
}`}</CodeBlock>
            <h3>Message Status Flow</h3>
            <CodeBlock>{`Insert message
  │
  ├─ Queue is "Send Now"  ──► status = pending ──► worker dispatches
  │
  └─ Queue is "Scheduled" ──► status = timing
                                   │
                                   └─ timing checker (every 5s) promotes to pending
                                      when created_at ≤ today's scheduled time
                                      and current time ≥ scheduled time`}</CodeBlock>
          </div>
        ),
      },
      {
        id: "queues-timing",
        title: "Scheduled (Timing) Queues",
        content: (
          <div className="space-y-4">
            <p>
              When <strong>Send Now</strong> is disabled and a{" "}
              <strong>Send Later Time</strong> is configured, messages are
              stored with status <code>timing</code> and only promoted to{" "}
              <code>pending</code> when the daily scheduled time arrives.
            </p>
            <h3>Execution Rules</h3>
            <ul>
              <li>
                Insert at <strong>00:04</strong>, schedule at{" "}
                <strong>00:05</strong> → executed at <strong>00:05</strong> ✅
              </li>
              <li>
                Insert at <strong>00:05</strong>, schedule at{" "}
                <strong>00:05</strong> → executed at <strong>00:05</strong> ✅
              </li>
              <li>
                Insert at <strong>00:06</strong>, schedule at{" "}
                <strong>00:05</strong> → executed at{" "}
                <strong>00:05 tomorrow</strong> ⏳
              </li>
            </ul>
            <p>
              The timing checker runs every <strong>5 seconds</strong> and
              evaluates eligibility per message by computing the{" "}
              <em>next occurrence</em> of the scheduled time after the message's
              own <code>created_at</code>.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: "log",
    label: "Log",
    icon: FileText,
    items: [
      {
        id: "log-overview",
        title: "Log Overview",
        content: (
          <div className="space-y-4">
            <p>
              The Log page shows a paginated, filterable list of all dispatch
              attempts with their status and response details.
            </p>
            <h3>Log Entry Fields</h3>
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Status</td>
                  <td>
                    <code>processing</code>, <code>completed</code>, or{" "}
                    <code>failed</code>.
                  </td>
                </tr>
                <tr>
                  <td>Queue</td>
                  <td>Which queue dispatched the message.</td>
                </tr>
                <tr>
                  <td>Method</td>
                  <td>HTTP method used for the outgoing request.</td>
                </tr>
                <tr>
                  <td>Response</td>
                  <td>HTTP response body from the origin server.</td>
                </tr>
                <tr>
                  <td>Error</td>
                  <td>Error message if the request failed.</td>
                </tr>
                <tr>
                  <td>Created At</td>
                  <td>When the log entry was created.</td>
                </tr>
              </tbody>
            </table>
            <h3>Filtering &amp; Pagination</h3>
            <ul>
              <li>Filter by status: All / Processing / Completed / Failed.</li>
              <li>
                Cursor-based pagination — click <em>Load More</em> to fetch
                older entries.
              </li>
              <li>Click any row to view full log details in a popup.</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: "whitelist",
    label: "Whitelist",
    icon: Shield,
    items: [
      {
        id: "whitelist-overview",
        title: "Whitelist Overview",
        content: (
          <div className="space-y-4">
            <p>
              The Whitelist controls which IP addresses and domains are allowed
              to call the public <code>POST /queue</code> endpoint.
            </p>
            <Callout type="info">
              If the whitelist is <strong>empty</strong>, all callers are
              allowed. Once at least one entry is added, only matching callers
              pass.
            </Callout>
            <h3>Entry Types</h3>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Matches on</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>ip</code>
                  </td>
                  <td>
                    Client IP address (<code>X-Forwarded-For</code> or direct).
                  </td>
                  <td>
                    <code>192.168.1.10</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>domain</code>
                  </td>
                  <td>
                    <code>Origin</code> or <code>Host</code> header.
                  </td>
                  <td>
                    <code>api.example.com</code>
                  </td>
                </tr>
              </tbody>
            </table>
            <h3>Adding an Entry</h3>
            <p>
              Click <strong>+ Add Entry</strong>, choose the type, enter the
              value and an optional label, then click <strong>Add</strong>.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: "apikey",
    label: "API Keys",
    icon: Key,
    items: [
      {
        id: "apikey-overview",
        title: "API Key Overview",
        content: (
          <div className="space-y-4">
            <p>
              API Keys protect the public <code>POST /queue</code> endpoint.
              When at least one key exists, every inbound request must supply a
              valid, active key.
            </p>
            <Callout type="info">
              If <strong>no keys</strong> are configured, the endpoint is open
              (no key required).
            </Callout>
            <h3>How to Pass a Key</h3>
            <CodeBlock>{`# Via header (recommended)
curl -H "X-Api-Key: apimq_abc123..." https://your-server/queue ...

# Via query parameter
curl "https://your-server/queue?api_key=apimq_abc123..." ...`}</CodeBlock>
            <h3>Key Lifecycle</h3>
            <ul>
              <li>
                <strong>Create</strong> — give the key a name; the value is
                auto-generated (prefix <code>apimq_</code>).
              </li>
              <li>
                <strong>Copy</strong> — use the copy button to copy the full key
                value. It cannot be shown again after creation.
              </li>
              <li>
                <strong>Disable/Enable</strong> — temporarily revoke access
                without deleting the key.
              </li>
              <li>
                <strong>Delete</strong> — permanently remove the key (requires
                confirmation).
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      {
        id: "settings-overview",
        title: "Settings Overview",
        content: (
          <div className="space-y-4">
            <p>
              The Settings page lets you change the admin dashboard password.
            </p>
            <h3>Change Password</h3>
            <ul>
              <li>Enter your current password.</li>
              <li>Enter a new password (minimum 6 characters).</li>
              <li>Confirm the new password.</li>
              <li>
                Click <strong>Update Password</strong>.
              </li>
            </ul>
            <Callout type="warning">
              The default password after a fresh install is set via the{" "}
              <code>.env</code> file. Change it immediately in production.
            </Callout>
          </div>
        ),
      },
    ],
  },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-dark-900/80 border border-dark-600/40 rounded-xl p-4 overflow-x-auto text-xs font-mono text-neon-green leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

function Callout({
  type,
  children,
}: {
  type: "info" | "warning";
  children: React.ReactNode;
}) {
  const styles =
    type === "info"
      ? "bg-accent-500/10 border-accent-500/30 text-accent-300"
      : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300";
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DocPage() {
  const [activeSection, setActiveSection] = useState("intro");
  const [activeItem, setActiveItem] = useState("what-is-apimq");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentSection = sections.find((s) => s.id === activeSection);
  const currentItem = currentSection?.items.find((i) => i.id === activeItem);

  const handleNav = (sectionId: string, itemId: string) => {
    setActiveSection(sectionId);
    setActiveItem(itemId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-dark-900 text-foreground flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-50 w-72 bg-dark-800 border-r border-dark-600/50 flex flex-col overflow-y-auto
          transition-transform duration-300
          lg:relative lg:translate-x-0 lg:flex
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-dark-600/50 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-accent-500/20 border border-accent-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-accent-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">ApiMQ Docs</p>
            <p className="text-[10px] text-dark-400 font-mono">v0.1.0</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-dark-400 hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = activeSection === section.id;
            return (
              <div key={section.id}>
                <button
                  onClick={() => handleNav(section.id, section.items[0].id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isExpanded
                      ? "text-accent-400 bg-accent-500/10"
                      : "text-dark-300 hover:text-foreground hover:bg-dark-700/50"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{section.label}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
                {isExpanded && section.items.length > 1 && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNav(section.id, item.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
                          activeItem === item.id
                            ? "text-accent-400 bg-accent-500/10 font-semibold"
                            : "text-dark-400 hover:text-foreground"
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-dark-600/50 shrink-0">
          <a
            href="/app/dashboard"
            className="flex items-center gap-2 text-xs text-dark-400 hover:text-foreground transition-colors font-mono"
          >
            ← Back to Dashboard
          </a>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-dark-800/60 border-b border-dark-600/50 flex items-center px-5 gap-3 shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-dark-400 hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm font-mono text-dark-400">
            <span className="text-accent-400">Docs</span>
            {currentSection && (
              <>
                <span>/</span>
                <span className="text-dark-300">{currentSection.label}</span>
              </>
            )}
            {currentItem && currentItem.title !== currentSection?.label && (
              <>
                <span>/</span>
                <span className="text-foreground">{currentItem.title}</span>
              </>
            )}
          </div>
        </header>

        {/* Article */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 prose-doc">
          {currentItem ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {currentItem.title}
              </h1>
              <div className="w-12 h-1 bg-accent-500 rounded-full mb-8" />
              <div className="doc-content">{currentItem.content}</div>
            </>
          ) : (
            <p className="text-dark-400">Select a topic from the sidebar.</p>
          )}
        </main>
      </div>

      {/* Inline styles for doc content */}
      <style>{`
        .doc-content h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-foreground, #f1f5f9);
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .doc-content p {
          color: rgb(148 163 184);
          line-height: 1.75;
          margin-bottom: 0.75rem;
        }
        .doc-content ul {
          list-style: disc;
          padding-left: 1.5rem;
          color: rgb(148 163 184);
          space-y: 0.25rem;
          margin-bottom: 0.75rem;
        }
        .doc-content li {
          margin-bottom: 0.35rem;
          line-height: 1.65;
        }
        .doc-content strong {
          color: rgb(226 232 240);
        }
        .doc-content code {
          background: rgba(99,102,241,0.12);
          color: rgb(129,140,248);
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.8rem;
          font-family: monospace;
        }
        .doc-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
          font-size: 0.85rem;
        }
        .doc-content th {
          text-align: left;
          padding: 0.5rem 0.75rem;
          background: rgba(51,65,85,0.5);
          color: rgb(148 163 184);
          font-weight: 600;
          border: 1px solid rgba(71,85,105,0.4);
        }
        .doc-content td {
          padding: 0.45rem 0.75rem;
          border: 1px solid rgba(71,85,105,0.3);
          color: rgb(148 163 184);
          vertical-align: top;
        }
        .doc-content td code {
          background: rgba(99,102,241,0.1);
          color: rgb(129,140,248);
        }
        .doc-content em {
          color: rgb(167,139,250);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
