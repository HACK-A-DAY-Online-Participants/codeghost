# Setup CodeGhost Test Repository with 15+ Bug Patterns
# This script creates a comprehensive test repository with various bug types

$testRepoPath = "C:\Users\user\Desktop\Hackathons\HACK-A-DAY\codeghost-test-demo"

# Remove existing repo if present
if (Test-Path $testRepoPath) {
    Remove-Item -Recurse -Force $testRepoPath
}

# Create and initialize repo
New-Item -ItemType Directory -Path $testRepoPath | Out-Null
Set-Location $testRepoPath
git init
git config user.name "Test User"
git config user.email "test@codeghost.dev"

Write-Host "Creating test files with bug patterns..." -ForegroundColor Cyan

# ==============================================
# FILE 1: Array Operations (Off-by-one errors)
# ==============================================
@"
class ArrayUtils {
  // Risk: 9 - Critical off-by-one error
  processItems(items: any[]) {
    for (let i = 0; i <= items.length; i++) {
      console.log(items[i]);
    }
  }

  findItem(arr: number[], target: number) {
    for (let i = 1; i <= arr.length; i++) {
      if (arr[i] === target) return i;
    }
    return -1;
  }

  reverseArray(arr: any[]) {
    for (let i = 0; i <= Math.floor(arr.length / 2); i++) {
      const temp = arr[i];
      arr[i] = arr[arr.length - 1 - i];
      arr[arr.length - 1 - i] = temp;
    }
  }
}
"@ | Out-File "arrayOps.ts" -Encoding utf8
git add arrayOps.ts
git commit -m "feat: add array operations module"

# Fix the bugs
@"
class ArrayUtils {
  // Fixed: Changed <= to <
  processItems(items: any[]) {
    for (let i = 0; i < items.length; i++) {
      console.log(items[i]);
    }
  }

  findItem(arr: number[], target: number) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === target) return i;
    }
    return -1;
  }

  reverseArray(arr: any[]) {
    for (let i = 0; i < Math.floor(arr.length / 2); i++) {
      const temp = arr[i];
      arr[i] = arr[arr.length - 1 - i];
      arr[arr.length - 1 - i] = temp;
    }
  }
}
"@ | Out-File "arrayOps.ts" -Encoding utf8
git add arrayOps.ts
git commit -m "fix: off-by-one error in loop boundary"

# ==============================================
# FILE 2: User Service (Null checks)
# ==============================================
@"
class UserService {
  constructor(private db: Database) {}

  // Risk: 8 - Missing null check causes crash
  getUserProfile(userId: string) {
    const user = this.db.findUser(userId);
    return user.name + ' - ' + user.email;
  }

  getDisplayName(user: any) {
    return user.profile.firstName + ' ' + user.profile.lastName;
  }

  getUserSettings(userId: string) {
    const user = this.db.findUser(userId);
    return user.settings.theme;
  }

  getAvatar(user: any) {
    return user.profile.avatar.url;
  }
}
"@ | Out-File "userService.ts" -Encoding utf8
git add userService.ts
git commit -m "feat: add user service for profile management"

# Fix null checks
@"
class UserService {
  constructor(private db: Database) {}

  // Fixed: Added optional chaining
  getUserProfile(userId: string) {
    const user = this.db.findUser(userId);
    return user?.name + ' - ' + user?.email;
  }

  getDisplayName(user: any) {
    return user?.profile?.firstName + ' ' + user?.profile?.lastName;
  }

  getUserSettings(userId: string) {
    const user = this.db.findUser(userId);
    return user?.settings?.theme;
  }

  getAvatar(user: any) {
    return user?.profile?.avatar?.url;
  }
}
"@ | Out-File "userService.ts" -Encoding utf8
git add userService.ts
git commit -m "fix: handle undefined user with optional chaining"

# ==============================================
# FILE 3: Async Operations (Missing await)
# ==============================================
@"
class DataService {
  // Risk: 7 - Missing await causes race conditions
  async saveUserData(userId: string, data: any) {
    const user = await this.getUser(userId);
    user.data = data;
    this.db.save(user); // Missing await!
    return user;
  }

  async processPayment(orderId: string) {
    const order = await this.getOrder(orderId);
    this.paymentGateway.charge(order.amount); // Missing await!
    order.status = 'paid';
    return order;
  }

  async sendNotification(userId: string, message: string) {
    const user = await this.getUser(userId);
    this.emailService.send(user.email, message); // Missing await!
    console.log('Notification sent');
  }
}
"@ | Out-File "dataService.ts" -Encoding utf8
git add dataService.ts
git commit -m "feat: add data persistence layer"

# Fix await issues
@"
class DataService {
  // Fixed: Added await for async operations
  async saveUserData(userId: string, data: any) {
    const user = await this.getUser(userId);
    user.data = data;
    await this.db.save(user);
    return user;
  }

  async processPayment(orderId: string) {
    const order = await this.getOrder(orderId);
    await this.paymentGateway.charge(order.amount);
    order.status = 'paid';
    return order;
  }

  async sendNotification(userId: string, message: string) {
    const user = await this.getUser(userId);
    await this.emailService.send(user.email, message);
    console.log('Notification sent');
  }
}
"@ | Out-File "dataService.ts" -Encoding utf8
git add dataService.ts
git commit -m "fix: add missing await for async operations"

# ==============================================
# FILE 4: String Operations (Type coercion)
# ==============================================
@"
class StringUtils {
  // Risk: 5 - Type coercion can cause unexpected results
  concatenate(a: any, b: any) {
    return a + b; // Should use String()
  }

  compare(str1: any, str2: any) {
    return str1 == str2; // Should use ===
  }

  isEmpty(value: any) {
    return value == null; // Should use === for strict check
  }

  isEqual(a: any, b: any) {
    return a == b; // Loose equality
  }
}
"@ | Out-File "stringUtils.ts" -Encoding utf8
git add stringUtils.ts
git commit -m "feat: add string manipulation utilities"

# Fix type coercion
@"
class StringUtils {
  // Fixed: Use strict equality and proper type conversion
  concatenate(a: any, b: any) {
    return String(a) + String(b);
  }

  compare(str1: any, str2: any) {
    return str1 === str2;
  }

  isEmpty(value: any) {
    return value === null || value === undefined;
  }

  isEqual(a: any, b: any) {
    return a === b;
  }
}
"@ | Out-File "stringUtils.ts" -Encoding utf8
git add stringUtils.ts
git commit -m "fix: use strict equality and proper type conversion"

# ==============================================
# FILE 5: Resource Management (Memory leaks)
# ==============================================
@"
class EventManager {
  // Risk: 6 - Memory leak from event listeners
  private listeners: Map<string, Function[]> = new Map();

  subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    // Missing: Return unsubscribe function
  }

  setupTimer() {
    setInterval(() => {
      this.checkStatus();
    }, 1000);
    // Missing: Clearinterval on cleanup
  }

  watchFile(path: string) {
    fs.watch(path, (event) => {
      this.handleFileChange(event);
    });
    // Missing: Close watcher
  }
}
"@ | Out-File "eventManager.ts" -Encoding utf8
git add eventManager.ts
git commit -m "feat: add event management system"

# Fix resource leaks
@"
class EventManager {
  // Fixed: Proper cleanup and unsubscribe
  private listeners: Map<string, Function[]> = new Map();

  subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return () => this.unsubscribe(event, callback);
  }

  setupTimer() {
    const timerId = setInterval(() => {
      this.checkStatus();
    }, 1000);
    return () => clearInterval(timerId);
  }

  watchFile(path: string) {
    const watcher = fs.watch(path, (event) => {
      this.handleFileChange(event);
    });
    return () => watcher.close();
  }
}
"@ | Out-File "eventManager.ts" -Encoding utf8
git add eventManager.ts
git commit -m "fix: proper cleanup to prevent memory leaks"

# ==============================================
# FILE 6: Error Handling (Try-catch)
# ==============================================
@"
class ApiClient {
  // Risk: 7 - Missing error handling
  async fetchData(url: string) {
    const response = await fetch(url);
    return response.json(); // Can throw if not JSON
  }

  parseJSON(data: string) {
    return JSON.parse(data); // Can throw on invalid JSON
  }

  async processRequest(req: Request) {
    const data = await this.fetchData(req.url);
    const result = this.transform(data);
    return result;
  }

  divide(a: number, b: number) {
    return a / b; // No check for division by zero
  }
}
"@ | Out-File "apiClient.ts" -Encoding utf8
git add apiClient.ts
git commit -m "feat: add API client for external services"

# Fix error handling
@"
class ApiClient {
  // Fixed: Added proper error handling
  async fetchData(url: string) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch data: ' + error.message);
    }
  }

  parseJSON(data: string) {
    try {
      return JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  async processRequest(req: Request) {
    try {
      const data = await this.fetchData(req.url);
      const result = this.transform(data);
      return result;
    } catch (error) {
      console.error('Request processing failed:', error);
      throw error;
    }
  }

  divide(a: number, b: number) {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }
}
"@ | Out-File "apiClient.ts" -Encoding utf8
git add apiClient.ts
git commit -m "fix: add error handling for edge cases"

# ==============================================
# FILE 7: Promise Handling (Unhandled rejections)
# ==============================================
@"
class PromiseHandler {
  // Risk: 6 - Unhandled promise rejection
  loadData() {
    this.fetchRemoteData(); // Promise not awaited or caught
  }

  processItems(items: any[]) {
    items.forEach(item => {
      this.saveItem(item); // Async in forEach, not awaited
    });
  }

  async initialize() {
    Promise.all([
      this.loadConfig(),
      this.connectDatabase(),
      this.startServer()
    ]); // Result not awaited
  }
}
"@ | Out-File "promiseHandler.ts" -Encoding utf8
git add promiseHandler.ts
git commit -m "feat: add promise handling utilities"

# Fix promise handling
@"
class PromiseHandler {
  // Fixed: Proper promise handling
  async loadData() {
    try {
      await this.fetchRemoteData();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async processItems(items: any[]) {
    await Promise.all(items.map(item => this.saveItem(item)));
  }

  async initialize() {
    await Promise.all([
      this.loadConfig(),
      this.connectDatabase(),
      this.startServer()
    ]);
  }
}
"@ | Out-File "promiseHandler.ts" -Encoding utf8
git add promiseHandler.ts
git commit -m "fix: handle promises properly to avoid unhandled rejections"

# ==============================================
# FILE 8: Variable Scoping (Closure issues)
# ==============================================
@"
class TimerManager {
  // Risk: 4 - Variable scoping issue in loop
  setupTimers(count: number) {
    for (var i = 0; i < count; i++) {
      setTimeout(() => {
        console.log('Timer ' + i); // Will always log final value
      }, i * 1000);
    }
  }

  createHandlers(items: string[]) {
    const handlers = [];
    for (var i = 0; i < items.length; i++) {
      handlers.push(() => console.log(items[i]));
    }
    return handlers;
  }
}
"@ | Out-File "timerManager.ts" -Encoding utf8
git add timerManager.ts
git commit -m "feat: add timer management system"

# Fix scoping
@"
class TimerManager {
  // Fixed: Use let instead of var for proper scoping
  setupTimers(count: number) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        console.log('Timer ' + i);
      }, i * 1000);
    }
  }

  createHandlers(items: string[]) {
    const handlers = [];
    for (let i = 0; i < items.length; i++) {
      handlers.push(() => console.log(items[i]));
    }
    return handlers;
  }
}
"@ | Out-File "timerManager.ts" -Encoding utf8
git add timerManager.ts
git commit -m "fix: use let instead of var for proper block scoping"

# ==============================================
# FILE 9: State Management (Race conditions)
# ==============================================
@"
class StateManager {
  // Risk: 7 - Race condition in state updates
  private state: any = {};

  async updateState(key: string, value: any) {
    const current = this.state[key];
    const computed = await this.compute(current, value);
    this.state[key] = computed; // Another update might happen during compute
  }

  async incrementCounter() {
    const current = this.getCounter();
    await this.delay(100);
    this.setCounter(current + 1); // Race condition!
  }
}
"@ | Out-File "stateManager.ts" -Encoding utf8
git add stateManager.ts
git commit -m "feat: add state management module"

# Fix race conditions
@"
class StateManager {
  // Fixed: Use locks or atomic operations
  private state: any = {};
  private locks: Map<string, Promise<void>> = new Map();

  async updateState(key: string, value: any) {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    
    const releasePromise = new Promise<void>(resolve => {
      (async () => {
        const current = this.state[key];
        const computed = await this.compute(current, value);
        this.state[key] = computed;
        this.locks.delete(key);
        resolve();
      })();
    });
    
    this.locks.set(key, releasePromise);
    await releasePromise;
  }

  async incrementCounter() {
    await this.updateState('counter', (c: number) => c + 1);
  }
}
"@ | Out-File "stateManager.ts" -Encoding utf8
git add stateManager.ts
git commit -m "fix: prevent race conditions with proper locking"

# ==============================================
# FILE 10: Validation (Input sanitization)
# ==============================================
@"
class Validator {
  // Risk: 8 - SQL injection vulnerability
  buildQuery(table: string, userInput: string) {
    return 'SELECT * FROM ' + table + ' WHERE name = ' + userInput;
  }

  // Risk: 7 - XSS vulnerability
  renderHTML(userContent: string) {
    return '<div>' + userContent + '</div>';
  }

  // Risk: 6 - Path traversal vulnerability
  readFile(filename: string) {
    return fs.readFileSync('./uploads/' + filename);
  }

  // Risk: 5 - Email validation missing
  isValidEmail(email: string) {
    return email.includes('@');
  }
}
"@ | Out-File "validator.ts" -Encoding utf8
git add validator.ts
git commit -m "feat: add input validation utilities"

# Fix validation
@"
class Validator {
  // Fixed: Use parameterized queries
  buildQuery(table: string, userInput: string) {
    return {
      query: 'SELECT * FROM ?? WHERE name = ?',
      params: [table, userInput]
    };
  }

  // Fixed: Escape HTML entities
  renderHTML(userContent: string) {
    const escaped = userContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return '<div>' + escaped + '</div>';
  }

  // Fixed: Validate and sanitize path
  readFile(filename: string) {
    const sanitized = path.basename(filename);
    return fs.readFileSync(path.join('./uploads', sanitized));
  }

  // Fixed: Proper email validation
  isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
"@ | Out-File "validator.ts" -Encoding utf8
git commit -am "fix: add proper input validation and sanitization"

Write-Host "`nTest repository created successfully!" -ForegroundColor Green
Write-Host "Location: $testRepoPath" -ForegroundColor Cyan
Write-Host "`nCommit Summary:" -ForegroundColor Yellow
git log --oneline

Write-Host "`n✅ Repository contains:" -ForegroundColor Green
Write-Host "  - 10 files with different bug categories"
Write-Host "  - 20 commits (10 features + 10 fixes)"
Write-Host "  - 15+ distinct bug patterns"
Write-Host "  - Risk scores ranging from 4 to 9"
Write-Host "`n📝 Run 'CodeGhost: Initialize' in VS Code to scan this repository!"
