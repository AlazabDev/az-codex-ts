## الوصف الكامل لتطبيق **Az Codex**

**Az Codex** هو منصة تشغيل وتطوير ذكية موجهة لإدارة بيئة العمل التقنية الخاصة بـ **Alazab Group**، تجمع في واجهة واحدة بين المحادثة مع وكيل ذكاء اصطناعي، إدارة المشاريع والملفات، تنفيذ المهام البرمجية، مراقبة بيئة التشغيل، التكامل مع الأنظمة الخارجية، والوصول المباشر إلى بيئة **Frappe / ERPNext** والبنية التحتية الإنتاجية.

التطبيق ليس مجرد Chat UI، بل **AI Engineering & Operations Workspace** مصمم ليكون نقطة التحكم المركزية لتطوير وتشغيل أنظمة العزب.

### الهدف الرئيسي

يهدف Az Codex إلى تحويل نموذج الذكاء الاصطناعي من مساعد محادثة إلى **وكيل تشغيلي فعلي** يستطيع العمل داخل بيئة المؤسسة، فهم المشاريع، فحص الأكواد، التعامل مع المستودعات، تنفيذ أوامر آمنة، تشغيل أدوات التطوير والاختبارات، مراقبة الخدمات، استخدام MCP والأدوات الخارجية، والعمل مباشرة على تطبيقات Frappe وERPNext ضمن سياسات صلاحيات واضحة.

بمعنى عملي:

```text
Developer Workspace
        +
AI Agent
        +
Production Operations
        +
Frappe / ERPNext
        +
MCP Integrations
        +
Git / Files / Terminal
        =
Az Codex
```

## واجهة الدردشة الذكية

واجهة المحادثة هي المركز الرئيسي للتطبيق. يستطيع المستخدم فتح محادثات متعددة مع Codex، الاحتفاظ بالسياق، متابعة العمليات الجارية، إرسال تعليمات تطوير أو تشغيل، ومراجعة النتائج والأدوات التي استخدمها الوكيل.

تدعم الواجهة إدارة الجلسات، المحادثات السابقة، المحادثات المؤرشفة والمثبتة، البحث داخل المحادثات، متابعة استهلاك السياق والتوكنز، نقل الجلسة بين حسابات Codex المختلفة، واستكمال العمل من جلسة سابقة دون فقدان السياق.

يمكن كذلك استخدام أوضاع متعددة مثل التخطيط، reasoning effort، personality، سرعة التنفيذ، المهارات Skills، وإعدادات الموافقة والصلاحيات.

## وكلاء Codex ونماذج الذكاء الاصطناعي

يدعم التطبيق أكثر من بيئة تشغيل لـCodex من خلال Profiles مستقلة.

الإعداد الإنتاجي الحالي مبني على:

```text
codex
└── OpenAI Codex
    └── /home/frappe/.codex

azcodex
└── Microsoft Foundry
    └── /home/frappe/.azcodex
```

والـProfile الافتراضي للإنتاج هو:

```text
azcodex
```

مما يسمح باستخدام deployment موجود على **Microsoft Foundry** مع فصل كامل بين إعدادات OpenAI وإعدادات Foundry.

التطبيق لا يعتمد على اسم نموذج مخمّن، بل يتطلب اسم Azure deployment الفعلي من متغيرات بيئة الإنتاج.

## Microsoft Foundry

يوجد تكامل مخصص مع Microsoft Foundry يتيح تشغيل Codex من خلال Azure AI infrastructure.

المسار يشمل:

```text
Az Codex WebUI
    ↓
Rust Gateway
    ↓
Codex App Server
    ↓
AZCODEX_HOME
    ↓
Microsoft Foundry
    ↓
Configured AI Deployment
```

ويتم التحقق من الاتصال الحقيقي باستخدام:

```bash
pnpm foundry:doctor
```

وهو اختبار فعلي وليس مجرد فحص للمتغيرات.

## MCP والأدوات الخارجية

Az Codex يدعم **Model Context Protocol – MCP** كمستوى تكامل رئيسي.

يمكن للوكيل الوصول إلى أدوات خارجية مثل:

```text
Daftra
Supabase
UberFix
ERPNext / Frappe
Azure
WhatsApp
GitHub
APIs
```

ويتم إدارة MCP من Registry موحد داخل المشروع.

واجهة التطبيق تعرض:

- MCP servers.
- حالة الاتصال.
- الأدوات المتاحة لكل Server.
- Resources.
- Authentication state.
- إعادة تحميل MCP configuration.

ويوجد فحص مستقل:

```bash
pnpm mcp:doctor
```

## تكامل Frappe وERPNext

من أهم وظائف التطبيق أنه يعمل كوكيل تطوير وتشغيل مباشر داخل بيئة Frappe.

المسار الإنتاجي المستهدف:

```text
/home/frappe/frappe-bench
```

ويستطيع الوكيل العمل على:

- Bench configuration.
- Installed apps.
- Sites.
- Frappe applications.
- ERPNext.
- migrations.
- build.
- cache.
- logs.
- application diagnostics.
- controlled maintenance operations.

ويتم ذلك من خلال Wrapper مخصص يحمي العمليات الحساسة.

في بيئة Production، العمليات الخطرة مثل:

```text
drop-site
reinstall
restore
```

تظل محظورة افتراضيًا.

كما يمكن أخذ Backup تلقائي قبل عمليات migration أو العمليات عالية الخطورة.

## Terminal Workspace

يتضمن التطبيق Terminal متكاملًا داخل الواجهة.

يمكن استخدامه لتنفيذ العمليات المتعلقة بالمشروع أو السيرفر دون مغادرة Az Codex.

ويتم ربط Terminal بالجلسة الحالية، مع إمكانية إضافة نتائج Terminal إلى Context الخاص بالمحادثة.

Terminal ليس مفتوحًا لكل المستخدمين؛ استخدامه مرتبط بالصلاحيات.

## Git Workspace

يتضمن Az Codex مساحة متكاملة لإدارة Git.

يمكن من خلالها:

- عرض حالة Repository.
- مراجعة الملفات المعدلة.
- عرض Commit history.
- مشاهدة diffs.
- فتح ملف معين.
- مقارنة التغييرات.
- التعامل مع GitHub pull requests.
- الانتقال بين Source وDiff وChat.

الهدف هو جعل مراجعة تعديلات الوكيل جزءًا من نفس الـWorkspace بدل الاعتماد على أدوات منفصلة.

## File Workspace

يوجد File Viewer/Editor لفتح الملفات مباشرة داخل التطبيق.

ويدعم التطبيق عرض ملفات المشروع وربطها بالمحادثة، مع إمكانيات مثل:

```text
Open file
View source
Edit file
View diff
Open in Git workspace
Attach context
```

## Monaco Editor

Az Codex يستخدم **Monaco Editor** لتوفير تجربة تحرير شبيهة بـVisual Studio Code.

ويدعم:

- Syntax highlighting.
- Text editor.
- Diff editor.
- TypeScript worker.
- JSON worker.
- HTML worker.
- CSS worker.

ولهذا يستطيع التطبيق التعامل مع ملفات مشاريع كبيرة وليس مجرد عرض نصوص داخل Chat.

## Computer Workspace

يوفر التطبيق مساحة Computer/Remote Interaction يستطيع الوكيل من خلالها استقبال وعرض Frames والتحكم في بعض عمليات الإدخال المتصلة ببيئة التنفيذ.

تشمل أدوات مثل:

- Text input.
- Enter.
- Escape.
- Scroll.
- Interaction status.
- Frame stream.

## Memory Workspace

هناك Workspace مخصص للذاكرة يسمح بعرض وإدارة المعلومات المتعلقة بسياق وكيل Codex والجلسات.

الهدف هو إبقاء الوكيل قادرًا على الاستمرار في المهام المعقدة دون إعادة شرح كل شيء في كل محادثة.

## Tasks وAutomations

يدعم التطبيق المهام والأتمتة.

يمكن للنظام تشغيل عمليات:

```text
manual
scheduled
```

كما توجد إدارة لحالات التنفيذ والـworktrees الناتجة عن عمليات الأتمتة.

هذا يسمح بتحويل Codex من Agent يعمل فقط عند الطلب إلى Agent يستطيع تنفيذ workflows متكررة.

## Skills وPlugins

Az Codex يدعم:

```text
Skills
Plugins
Marketplaces
Apps
Hooks
```

وبالتالي يمكن توسيع قدراته بدون تعديل النواة الرئيسية لكل تكامل جديد.

يمكن للوكيل استخدام Skills محلية أو Skills مرتبطة بPlugins، مع دعم Catalog موحد داخل التطبيق.

## Production Workspace

تم إضافة Workspace مخصص للتشغيل الإنتاجي باسم:

**Production / الإنتاج**

ويعرض في واجهة واحدة:

```text
Codex Runtime
Gateway Build
Memory Usage
OOM Status
Active App-server Sessions
Codex Profiles
Foundry Profile
Allowed Roots
MCP Status
Production Tools
```

كما يوفر روابط مباشرة إلى:

```text
Git
Terminal
Diagnostics
Settings
MCP
```

## أدوات الإنتاج

يمكن للـOwner تشغيل اختبارات Production من الواجهة نفسها.

الأدوات الحالية هي:

```text
Release Gate
pnpm release:check

Foundry Live
pnpm foundry:doctor

Production Doctor
pnpm prod:doctor

MCP Doctor
pnpm mcp:doctor
```

ولا يتم إرسال Shell command حر من الواجهة.

الواجهة ترسل فقط معرفًا ثابتًا:

```text
release
foundry
production
mcp
```

والـRust backend هو الذي يحوله إلى أمر محدد داخل Allowlist.

هذه نقطة أمنية مهمة لأنها تمنع تحويل Production Workspace إلى Remote Shell غير مقيد.

## Diagnostics Workspace

يوجد قسم Diagnostics لمراقبة الحالة الداخلية للتطبيق.

يمكن من خلاله متابعة:

- Runtime.
- Sessions.
- Connection state.
- Notifications.
- parser/runtime events.
- Codex processes.
- session health.

ويساعد هذا في معرفة هل المشكلة ناتجة عن WebUI، Gateway، Codex، MCP، أو خدمة خارجية.

## إدارة عمليات Codex

Rust Gateway يدير Codex app-server processes.

ويستطيع التطبيق تتبع:

```text
running processes
session count
runtime version
update state
memory consumption
OOM events
```

كما يدعم handoff عند إعادة تشغيل التطبيق لتقليل خسارة الجلسات النشطة.

وفي إعداد السيرفر منخفض الموارد تم ضبط:

```text
CODEX_WEBUI_PER_SESSION_APP_SERVERS=false
```

حتى لا يتم تشغيل process مستقل لكل Session.

## نظام الصلاحيات

التطبيق يستخدم مستويات صلاحيات مختلفة.

النموذج الأساسي:

```text
Viewer
Admin
Owner
```

### Viewer

وصول للعرض والقراءة فقط في الوظائف المسموحة.

### Admin

يمكنه الوصول إلى أدوات الإدارة والمراقبة والتكاملات حسب السياسة المحددة.

### Owner

يمتلك العمليات الحساسة مثل:

```text
Production checks
Gateway restart
Runtime management
Terminal
MCP reload
Plugin management
Marketplace management
Sensitive configuration
```

الـBackend نفسه يتحقق من الصلاحية، وليس الـFrontend فقط.

## نظام المصادقة

Az Codex يمتلك بوابة تسجيل دخول مستقلة.

الإصدار الحالي يستخدم **Password authentication** ولا يعتمد على Username وهمي.

وتتضمن بوابة الدخول:

- Password authentication.
- Secure session cookie.
- hCaptcha.
- Secure cookies.
- SameSite policy.
- Origin validation.
- Proxy trust restrictions.

واجهة تسجيل الدخول الجديدة تستخدم هوية:

```text
Az Codex
AI OPERATIONS
```

مع رسالة:

```text
Enterprise
AI Development
Workspace.
```

وهي متوافقة مع ألوان Alazab:

```text
#030957
#FFB900
```

## حماية الجلسات

Production configuration يتضمن:

```text
CODEX_WEBUI_REQUIRE_OWNER=true
CODEX_WEBUI_REQUIRE_ORIGIN_HEADER=true
CODEX_WEBUI_COOKIE_SAMESITE=strict
CODEX_WEBUI_COOKIE_SECURE=true
```

ويعمل WebUI خلف Nginx فقط.

الـGateway لا يتم نشره مباشرة للإنترنت، بل يستمع على:

```text
127.0.0.1:4173
```

## Rust Gateway

الـBackend الأساسي مكتوب بـRust ويعمل كبوابة مركزية بين الواجهة والأنظمة الداخلية.

من مسؤولياته:

- WebSocket API.
- Authentication.
- Sessions.
- Codex process management.
- MCP communication.
- Files.
- Terminal.
- Git.
- SQLite data.
- uploads.
- notifications.
- automation.
- runtime state.
- security checks.
- audit logging.
- Production tools.

تقنيات الـBackend الأساسية تشمل:

```text
Axum
Tokio
WebSocket
Reqwest
Rustls
Rusqlite
Serde
Scrypt
Tracing
```

## SvelteKit Frontend

الواجهة مبنية باستخدام:

```text
Svelte 5
SvelteKit
TypeScript
Vite
Tailwind CSS
Lucide
Monaco Editor
xterm
Marked
Lowlight
Paraglide
```

وتدعم:

```text
Responsive UI
Dark / Light theme
Multilingual UI
PWA features
Lazy-loaded workspaces
Code splitting
Realtime updates
```

## دعم اللغات

يحتوي التطبيق على نظام ترجمة باستخدام Paraglide.

المنصة معدة لتقديم واجهة متعددة اللغات، ويظهر ذلك أيضًا في هوية التطبيق:

```text
AR / EN
BILINGUAL
```

## Attachments

يمكن للمستخدم إرسال ملفات ومرفقات للوكيل.

Production configuration يسمح حاليًا بحجم رفع يصل إلى:

```text
100 MB per upload
```

وسعة تخزين مرفقات إجمالية قابلة للضبط.

## Notifications

يوجد Notification subsystem يمكنه التعامل مع:

- Internal notifications.
- Event types.
- Webhooks.
- Slack-compatible webhook destinations.
- Mark as read.
- Clear.
- Notification settings.

## Audit Logging

العمليات الإدارية والحساسة يتم إدخالها في Audit trail.

ويشمل ذلك عمليات مثل:

```text
configuration changes
runtime changes
production checks
plugins
marketplaces
MCP mutations
terminal operations
system actions
```

## Release Gate

لا يعتمد Az Codex على مجرد نجاح `pnpm build`.

قبل اعتماد إصدار Production يتم تشغيل:

```bash
pnpm release:check
```

وهو يجمع سلسلة اختبارات تشمل:

```text
Svelte / TypeScript checks
Rust checks
Unit tests
Frontend tests
Production build
Secrets scan
MCP validation
API parity
Codex compatibility
Security regressions
Tunnel safety
Low-memory smoke test
Package integrity
```

## Package Integrity

يوجد فحص مستقل:

```bash
pnpm pack:check
```

لضمان عدم دخول ملفات غير مناسبة إلى Release package مثل:

```text
backend/target
node_modules
.git
*.bak
```

كما توجد حدود لحجم الحزمة.

## النشر الإنتاجي

البنية الإنتاجية المستهدفة:

```text
Internet
   ↓
codex.alazab.com
   ↓
HTTPS / Nginx
   ↓
127.0.0.1:4173
   ↓
Az Codex Rust Gateway
   ↓
Codex App Server
   ├── Microsoft Foundry
   ├── OpenAI
   ├── MCP
   ├── Git
   ├── Terminal
   └── Frappe Bench
```

المسار الأساسي للتطبيق:

```text
/opt/az-codex
```

ومتغيرات الإنتاج:

```text
/etc/az-codex/az-codex.env
```

## systemd

يوجد Service مستقل:

```text
az-codex.service
```

مع Health service:

```text
az-codex-health.service
```

وHealth timer دوري:

```text
az-codex-health.timer
```

يتم فحص التطبيق بصورة دورية وإعادة تشغيله عند فشل health endpoint.

## Health Checks

يوفر التطبيق:

```text
/healthz
/readyz
```

الأول للتحقق من أن الخدمة تعمل، والثاني للتحقق من أنها جاهزة فعليًا لاستقبال العمل.

## Nginx وTLS

النشر الخارجي يتم فقط من خلال:

```text
https://codex.alazab.com
```

مع:

- TLS 1.2 / TLS 1.3.
- WebSocket proxy.
- Secure headers.
- 100 MB upload limit.
- Long-lived WebSocket connections.

كما يوجد Bootstrap configuration منفصل للحصول على أول شهادة Let's Encrypt دون كشف صفحة تسجيل الدخول عبر HTTP.

## Deployment Automation

يوجد مسار نشر موحد داخل المشروع:

```text
deploy/scripts/
```

ويشمل:

```text
preflight.sh
install-system.sh
enable-tls.sh
deploy.sh
rollback.sh
status.sh
```

`deploy.sh` ينفذ:

```text
Git update
↓
Dependency validation
↓
Release check
↓
Foundry doctor
↓
Production doctor
↓
systemd update
↓
Service restart
↓
healthz
↓
readyz
```

## Rollback

قبل أي Deployment يتم حفظ الـcommit السابق.

ويمكن الرجوع إليه تلقائيًا باستخدام:

```bash
sudo bash deploy/scripts/rollback.sh
```

بدون ربط عملية Rollback الخاصة بالكود بقاعدة بيانات Frappe.

## فلسفة التطبيق

الفكرة الأساسية في Az Codex هي أن المستخدم لا يحتاج أن ينتقل بين:

```text
ChatGPT
Terminal
VS Code
GitHub
Server SSH
ERPNext
MCP tools
Monitoring
Azure
```

لكل خطوة.

Az Codex يحاول جمع دورة العمل كاملة في Workspace واحدة:

```text
Ask
↓
Inspect
↓
Plan
↓
Edit
↓
Run
↓
Test
↓
Review Diff
↓
Validate
↓
Deploy
↓
Monitor
```
