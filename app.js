const App = {
  data() {
    return {
      currentSection: "auth",
      currentUser: null,
      theme: "light",
      users: [],
      groups: [
        {
          id: "group-1",
          code: "1234",
          name: "Мобильная робототехника и программирование роботов",
          teacherName: "Иванов Иван Иванович",
        },
      ],
      instructions: [],
      collections: [],
      filters: {
        category: "",
        difficulty: "",
        showOnlyUncompleted: false,
        collectionId: "",
        search: "",
      },
      loginForm: {
        login: "",
        password: "",
        role: "user",
      },
      registerForm: {
        lastName: "",
        firstName: "",
        patronymic: "",
        associationName: "",
        groupCode: "",
        login: "",
        password: "",
        role: "user",
      },
      authError: "",
      registerError: "",
      registerSuccess: "",
      adminTab: "instructions",
      authMode: "choose",
      leaderboardLeague: "junior",
      instructionForm: {
        title: "",
        categories: "",
        collectionId: "",
        slides: 10,
        complexConnections: 2,
        programComplexity: 3,
        selfAssembly: false,
        selfProgramming: false,
        fixing: false,
        difficulty: "easy",
        imageUrl: "",
        hasMotor: false,
        hasSensors: false,
        format: "pdf",
      },
      collectionForm: {
        name: "",
      },
      activeInstruction: null,
      completionForm: {
        earnedExp: 0,
        confirmCode: "",
        error: "",
      },
      ui: {
        openSelect: "",
      },
      avatarMale: "./male.png",
      avatarFemale: "./female.png",
    };
  },
  computed: {
    isAdminLike() {
      return this.currentUser && (this.currentUser.role === "admin" || this.currentUser.role === "moderator");
    },
    currentUserRoleLabel() {
      return this.currentUser ? this.roleLabel(this.currentUser.role) : "";
    },
    currentUserHeaderText() {
      if (!this.currentUser) {
        return "";
      }
      const role = this.currentUserRoleLabel || "";
      if (role) {
        return this.currentUser.name + " (" + role + ")";
      }
      return this.currentUser.name;
    },
    currentGroup() {
      if (!this.currentUser) {
        return this.groups[0];
      }
      const group = this.groups.find((g) => g.id === this.currentUser.groupId);
      return group || this.groups[0];
    },
    heroAssociationName() {
      const group = this.currentGroup;
      if (group && group.name) {
        return group.name;
      }
      return "Мобильная робототехника и программирование роботов";
    },
    heroTeacherName() {
      return this.currentTeacherName || "";
    },
    currentTeacherName() {
      if (!this.currentUser) {
        return this.currentGroup.teacherName;
      }
      const admins = this.users.filter(
        (u) => u.groupId === this.currentUser.groupId && u.role === "admin" && u.active
      );
      if (!admins.length) {
        return this.currentGroup.teacherName;
      }
      const selfAdmin = admins.find((u) => u.id === this.currentUser.id);
      if (selfAdmin) {
        return selfAdmin.name;
      }
      return admins[0].name;
    },
    userCompletedCount() {
      if (!this.currentUser || !this.currentUser.completedInstructions) {
        return 0;
      }
      return this.currentUser.completedInstructions.length;
    },
    userLevel() {
      if (!this.currentUser) return 1;
      // П.7 ТЗ: уровень = 1 + floor(выполненных_инструкций / 5)
      return Math.floor(this.userCompletedCount / 5) + 1;
    },
    userLevelProgress() {
      // Процент до следующего уровня (каждые 5 инструкций = +1 уровень)
      return (this.userCompletedCount % 5) * 20;
    },
    nextLevelInstructionsRemaining() {
      if (!this.currentUser) return 0;
      const completed = this.userCompletedCount;
      const remainder = completed % 5;
      return remainder === 0 ? 5 : 5 - remainder;
    },
    nextRankInstructionsRemaining() {
      if (!this.currentUser) return 0;
      const students =
        this.leaderboardLeague === "senior"
          ? this.leaderboardSeniorSorted
          : this.leaderboardJuniorSorted;
      const index = students.findIndex((u) => u.id === this.currentUser.id);
      if (index <= 0) return 0;
      const ahead = students[index - 1];
      const myCompleted = (this.currentUser.completedInstructions || []).length;
      const aheadCompleted = (ahead.completedInstructions || []).length;
      const diff = aheadCompleted - myCompleted;
      if (diff <= 0) return 0;
      return diff + 1;
    },
    nextLevelChargePercent() {
      if (!this.currentUser) return 0;
      return this.userLevelProgress;
    },
    nextRankChargePercent() {
      if (!this.currentUser) return 0;
      const remaining = this.nextRankInstructionsRemaining;
      if (remaining === 0) return 100;
      const base = (this.currentUser.completedInstructions || []).length;
      const target = base + remaining;
      if (target <= 0) return 0;
      const progress = base / target;
      return Math.max(0, Math.min(Math.round(progress * 100), 100));
    },
    allCategories() {
      const set = new Set();
      this.groupInstructions.forEach((i) => {
        (i.categories || []).forEach((c) => set.add(c));
      });
      return Array.from(set);
    },
    categoryOptions() {
      return [{ value: "", label: "Все категории" }].concat(
        this.allCategories.map((c) => ({ value: c, label: c }))
      );
    },
    difficultyOptions() {
      return [
        { value: "", label: "Любая" },
        { value: "easy", label: "Легко" },
        { value: "medium", label: "Средне" },
        { value: "hard", label: "Сложно" },
      ];
    },
    instructionFormPreviewMaxExp() {
      return this.computeMaxExp({
        slides: this.instructionForm.slides,
        slidesCount: this.instructionForm.slides,
        complexConnections: this.instructionForm.complexConnections,
        complexConnectionsCount: this.instructionForm.complexConnections,
        selfAssemblyBonus: this.instructionForm.selfAssembly,
        selfProgrammingBonus: this.instructionForm.selfProgramming,
        fixMalfunctionBonus: this.instructionForm.fixing,
        difficulty: this.instructionForm.difficulty,
      });
    },
    teacherCurrentConfirmCode() {
      if (!this.currentUser || this.currentUser.role !== "admin") return "";
      return this.currentUser.teacherConfirmCode || "";
    },
    currentCategoryLabel() {
      const opt = this.categoryOptions.find((o) => o.value === this.filters.category);
      return (opt && opt.label) || "Все категории";
    },
    currentDifficultyLabel() {
      const opt = this.difficultyOptions.find((o) => o.value === this.filters.difficulty);
      return (opt && opt.label) || "Любая";
    },
    loginRoleLabelText() {
      return this.roleLabel(this.loginForm.role);
    },
    groupCollections() {
      const gid = this.currentUser ? this.currentUser.groupId : (this.groups[0] && this.groups[0].id);
      if (!gid) return [];
      return this.collections.filter((c) => (c.groupId || "group-1") === gid);
    },
    filteredCollections() {
      const list = this.groupCollections;
      if (!this.filters.category) {
        return list;
      }
      return list.filter(col => {
        return this.groupInstructions.some(instr => 
          instr.collectionId === col.id && instr.categories.includes(this.filters.category)
        );
      });
    },
    groupInstructions() {
      const gid = this.currentUser ? this.currentUser.groupId : (this.groups[0] && this.groups[0].id);
      if (!gid) return [];
      return this.instructions.filter((i) => (i.groupId || "group-1") === gid);
    },
    filteredInstructions() {
      let list = this.groupInstructions.slice();

      if (this.filters.category) {
        list = list.filter((i) => i.categories.includes(this.filters.category));
      }

      if (this.filters.collectionId) {
        list = list.filter((i) => i.collectionId === this.filters.collectionId);
      }

      if (this.filters.difficulty) {
        list = list.filter((i) => i.difficulty === this.filters.difficulty);
      }
      if (this.currentUser && this.filters.showOnlyUncompleted) {
        const completed = new Set(this.currentUser.completedInstructions);
        list = list.filter((i) => !completed.has(i.id));
      }
      // П.16 ТЗ: полный список всех инструкций в случайном порядке
      return list.sort(() => Math.random() - 0.5);
    },
    groupUsers() {
      if (!this.currentUser) {
        return [];
      }
      return this.users.filter((u) => u.groupId === this.currentUser.groupId && u.active);
    },
    groupTotalExp() {
      return this.groupUsers.reduce((sum, u) => sum + (u.exp || 0), 0);
    },
    groupAverageExp() {
      if (!this.groupUsers.length) {
        return 0;
      }
      return Math.round(this.groupTotalExp / this.groupUsers.length);
    },
    allUsers() {
      return this.users.filter((u) => u.active);
    },
    allAdmins() {
      return this.allUsers.filter((u) => u.role === "admin");
    },
    allStudents() {
      return this.allUsers.filter((u) => u.role === "user");
    },
    leaderboardStudents() {
      // П.8 ТЗ: убрать разделение по возрасту — все учащиеся группы в таблице
      const gid = this.currentUser ? this.currentUser.groupId : (this.groups[0] && this.groups[0].id);
      return this.allStudents.filter((u) => (u.groupId || "group-1") === (gid || "group-1"));
    },
    leaderboardJuniorSorted() {
      return [...this.leaderboardStudents].sort((a, b) => {
        const levelDiff = this.getUserLevel(b) - this.getUserLevel(a);
        if (levelDiff !== 0) return levelDiff;

        const expDiff = (b.exp || 0) - (a.exp || 0);
        if (expDiff !== 0) return expDiff;

        const aTime = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0;
        const bTime = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime; // тот, кто завершил ПОЗЖЕ, идёт выше

        return (a.name || "").localeCompare(b.name || "");
      });
    },
    leaderboardSeniorSorted() {
      return [...this.leaderboardStudents].sort((a, b) => {
        const expDiff = (b.exp || 0) - (a.exp || 0);
        if (expDiff !== 0) return expDiff;

        const levelDiff = this.getUserLevel(b) - this.getUserLevel(a);
        if (levelDiff !== 0) return levelDiff;

        const aTime = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0;
        const bTime = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;

        return (a.name || "").localeCompare(b.name || "");
      });
    },
    profileDaysOnPlatform() {
      if (!this.currentUser) return 0;
      const created = this.currentUser.createdAt ? new Date(this.currentUser.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return "—";
      const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      return days;
    },
    profileAgeOptions() {
      if (!this.currentUser) return [5, 6, 7, 8, 9, 10];
      if (this.currentUser.role === "user") return [5, 6, 7, 8, 9, 10];
      const arr = [];
      for (let i = 18; i <= 65; i++) arr.push(i);
      return arr;
    },
    allTotalExp() {
      return this.allUsers.reduce((sum, u) => sum + (u.exp || 0), 0);
    },
  },
  methods: {
    getUserAvatar(user) {
      if (!user) return null;
      const g = user.gender || "";
      if (g === "male") return this.avatarMale;
      if (g === "female") return this.avatarFemale;
      return null;
    },
    getAvatarLetter(user) {
      if (!user || !user.name) return "?";
      const n = String(user.name).trim();
      return (n[0] || "?").toUpperCase();
    },
    updateProfileField(field, value) {
      if (!this.currentUser) return;
      const idx = this.users.findIndex((u) => u.id === this.currentUser.id);
      if (idx === -1) return;
      this.users[idx][field] = value;
      this.currentUser = JSON.parse(JSON.stringify(this.users[idx]));
      this.saveState();
    },
    getCollectionImage(collectionId, index) {
      if (!Array.isArray(this.groupInstructions)) return "";
      const instrs = this.groupInstructions.filter(i => i.collectionId === collectionId);
      if (instrs[index] && instrs[index].imageUrl) {
        return instrs[index].imageUrl;
      }
      return ""; // Or a placeholder
    },
    goSection(section) {
      if (section === "profile" && !this.currentUser) {
        this.currentSection = "auth";
        return;
      }
      this.currentSection = section;
    },
    handleCollectionClick(col) {
      if (this.filters.collectionId === col.id) {
        this.filters.collectionId = "";
        return;
      }
      this.filters.collectionId = col.id;
      this.$nextTick(() => {
        const target = document.querySelector(".instruction-grid");
        if (target && typeof target.scrollIntoView === "function") {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    },
    applyTheme() {
      const root = document.documentElement;
      if (this.theme === "dark") {
        root.classList.add("theme-dark");
      } else {
        root.classList.remove("theme-dark");
      }
      window.localStorage.setItem("site-theme", this.theme);
    },
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";
      this.applyTheme();
    },
    toggleSelect(name) {
      this.ui.openSelect = this.ui.openSelect === name ? "" : name;
    },
    closeAllSelects() {
      this.ui.openSelect = "";
    },
    selectLoginRole(value) {
      this.loginForm.role = value;
      this.closeAllSelects();
    },
    selectFilterCategory(value) {
      this.filters.category = value;
      this.filters.collectionId = ""; // Reset collection when category changes
      this.closeAllSelects();
    },
    selectFilterDifficulty(value) {
      this.filters.difficulty = value;
      this.closeAllSelects();
    },
    getUserLevel(user) {
      if (!user || !user.completedInstructions) return 1;
      return Math.floor((user.completedInstructions.length || 0) / 5) + 1;
    },
    getUserCompletedCount(user) {
      if (!user || !user.completedInstructions) return 0;
      return (user.completedInstructions || []).length;
    },
    roleLabel(role) {
      if (role === "user") return "Учащийся";
      if (role === "admin") return "Администратор";
      if (role === "moderator") return "Модератор";
      return role;
    },
    difficultyLabel(value) {
      if (value === "easy") return "Легко";
      if (value === "medium") return "Средне";
      if (value === "hard") return "Сложно";
      return value;
    },
    instructionCardClass(instruction) {
      if (!this.currentUser) {
        return "easy-not-completed";
      }
      const completed = this.currentUser.completedInstructions.includes(instruction.id);
      const base = instruction.difficulty;
      return `${base}-${completed ? "completed" : "not-completed"}`;
    },
    starClass(instruction) {
      if (!this.currentUser) {
        return "star-easy-not-completed";
      }
      const completed = this.currentUser.completedInstructions.includes(instruction.id);
      if (completed) {
        return "star-completed";
      }
      if (instruction.difficulty === "easy") return "star-easy-not-completed";
      if (instruction.difficulty === "medium") return "star-medium-not-completed";
      if (instruction.difficulty === "hard") return "star-hard-not-completed";
      return "";
    },
    instructionExperienceLabel(instruction) {
      if (!this.currentUser) {
        return `Макс. ${this.computeMaxExp(instruction)}`;
      }
      const record = this.currentUser.instructionResults[instruction.id];
      if (!record) {
        return `Макс. ${this.computeMaxExp(instruction)}`;
      }
      return `${record.earnedExp}`;
    },
    defaultInstructionDescription(instruction) {
      const difficultyText = this.difficultyLabel(instruction.difficulty);
      const slides = Number(instruction.slidesCount || instruction.slides || 0);
      const hasProgrammingBonus = instruction.selfProgrammingBonus;
      const hasFixBonus = instruction.fixMalfunctionBonus;
      const parts = [];
      parts.push(`Собери робота «${instruction.title}» по бумажной или экранной инструкции.`);
      if (slides) {
        parts.push(`Всего примерно ${slides} шагов сборки.`);
      }
      if (hasProgrammingBonus) {
        parts.push("После сборки запрограммируй робота, чтобы он выполнял задание.");
      }
      if (hasFixBonus) {
        parts.push("Если робот ведёт себя не так, попробуй найти и исправить ошибку.");
      }
      parts.push(`Это уровень сложности: ${difficultyText}.`);
      return parts.join(" ");
    },
    computeMaxExp(instruction) {
      const slides = Number(instruction.slidesCount || instruction.slides || 0);
      const complexConnections = Number(instruction.complexConnectionsCount || instruction.complexConnections || 0);

      // Вес опыта за слайд в зависимости от сложности
      let diffWeight = 1;
      if (instruction.difficulty === "medium") diffWeight = 2;
      if (instruction.difficulty === "hard") diffWeight = 3;

      // Сложные этапы всегда константа 3 (умножает вес этапа на 3)
      const complexStepWeight = diffWeight * 3;

      // Базовый расчет: (Обычные слайды * Вес) + (Сложные слайды * ВесСложного)
      // Считаем complexConnections как количество сложных этапов
      const normalSlides = Math.max(0, slides - complexConnections);
      let base = (normalSlides * diffWeight) + (complexConnections * complexStepWeight);

      // Бонусы: +10% за самостоятельную сборку и программирование
      if (instruction.selfAssemblyBonus) {
        base += base * 0.1;
      }
      if (instruction.selfProgrammingBonus) {
        base += base * 0.1;
      }
      // Бонус за исправление ошибок
      if (instruction.fixMalfunctionBonus) {
        base += base * 0.1;
      }

      return Math.round(base);
    },
    fallbackImageForInstruction(instruction) {
      const title = instruction.title || "Робот";
      let bg = "#bfdbfe";
      if (instruction.difficulty === "medium") {
        bg = "#fde68a";
      } else if (instruction.difficulty === "hard") {
        bg = "#fecaca";
      }
      const svg =
        "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>" +
        `<rect width='600' height='400' fill='${bg}'/>` +
        "<g transform='translate(100,120)' fill='none' stroke='#111827' stroke-width='4'>" +
        "<rect x='40' y='80' width='260' height='120' rx='24' fill='white'/>" +
        "<circle cx='90' cy='200' r='28' fill='white'/>" +
        "<circle cx='250' cy='200' r='28' fill='white'/>" +
        "</g>" +
        `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='#111827' font-family='system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'>${title}</text>` +
        "</svg>";
      return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    },
    onInstructionImageError(event, instruction) {
      if (!event || !event.target) {
        return;
      }
      event.target.onerror = null;
      event.target.src = this.fallbackImageForInstruction(instruction);
    },
    handleLogin() {
      this.authError = "";
      const { login, password, role } = this.loginForm;
      const found = this.users.find((u) => u.login === login && u.password === password && u.role === role && u.active);
      if (!found) {
        this.authError = "Неверные данные или аккаунт не активен.";
        return;
      }
      this.currentUser = JSON.parse(JSON.stringify(found));
      this.goSection("instructions");
    },
    handleRegister() {
      this.registerError = "";
      this.registerSuccess = "";
      const lastName = (this.registerForm.lastName || "").trim();
      if (!lastName) {
        this.registerError = "Фамилия обязательна для заполнения.";
        return;
      }
      const firstName = (this.registerForm.firstName || "").trim();
      const patronymic = (this.registerForm.patronymic || "").trim();
      const fullName = [lastName, firstName, patronymic].filter(Boolean).join(" ");

      let group;
      if (this.registerForm.role === "admin") {
        const associationName = (this.registerForm.associationName || "").trim();
        if (!associationName) {
          this.registerError = "Укажите название объединения.";
          return;
        }
        const newGroupId = `group-${Date.now()}`;
        const newCode = String(1000 + Math.floor(Math.random() * 9000));
        group = {
          id: newGroupId,
          code: newCode,
          name: associationName,
          teacherName: fullName,
        };
        this.groups.push(group);
      } else {
        group = this.groups.find((g) => g.code === this.registerForm.groupCode);
        if (!group) {
          this.registerError = "Неверный код объединения.";
          return;
        }
      }
      const exists = this.users.some((u) => u.login === this.registerForm.login);
      if (exists) {
        this.registerError = "Пользователь с таким логином уже существует.";
        return;
      }
      const now = new Date();
      const activeUntil = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 90);
      const newUser = {
        id: `user-${Date.now()}`,
        name: fullName,
        login: this.registerForm.login,
        password: this.registerForm.password,
        role: this.registerForm.role === "admin" ? "admin" : "user",
        groupId: group.id,
        exp: 0,
        completedInstructions: [],
        instructionResults: {},
        teacherConfirmCode: "",
        lastCompletedAt: null,
        active: true,
        activeUntil: activeUntil.toISOString(),
        createdAt: now.toISOString(),
        gender: "",
        age: 0,
      };
      this.users.push(newUser);
      this.saveState();
      this.currentUser = JSON.parse(JSON.stringify(newUser));
      this.goSection("instructions");
      this.registerForm.lastName = "";
      this.registerForm.firstName = "";
      this.registerForm.patronymic = "";
      this.registerForm.associationName = "";
      this.registerForm.login = "";
      this.registerForm.password = "";
      this.registerForm.groupCode = "";
      this.registerForm.role = "user";
    },
    logout() {
      this.currentUser = null;
      this.goSection("auth");
    },
    openInstruction(instruction) {
      this.activeInstruction = instruction;
      const maxExp = this.computeMaxExp(instruction);
      this.completionForm.earnedExp = maxExp;
      this.completionForm.confirmCode = "";
      this.completionForm.error = "";
      const modalElement = document.getElementById("instructionModal");
      if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
      }
    },
    completeInstructionWithCode() {
      if (!this.currentUser || !this.activeInstruction) {
        return;
      }
      const code = String(this.completionForm.confirmCode || "").trim();
      if (!code) {
        this.completionForm.error = "Введите код подтверждения от преподавателя.";
        return;
      }
      const groupId = this.currentUser.groupId;
      const teachers = this.users.filter(
        (u) =>
          u.active &&
          u.role === "admin" &&
          u.groupId === groupId &&
          u.teacherConfirmCode
      );
      const ok = teachers.some((t) => t.teacherConfirmCode === code);
      if (!ok) {
        this.completionForm.error = "Неверный код подтверждения. Обратитесь к преподавателю.";
        return;
      }
      this.completionForm.error = "";
      const maxExp = this.computeMaxExp(this.activeInstruction);
      this.completionForm.earnedExp = maxExp;
      this.completeInstruction();
      this.completionForm.confirmCode = "";
    },
    completeInstructionMax() {
      if (!this.currentUser || !this.activeInstruction) {
        return;
      }
      const maxExp = this.computeMaxExp(this.activeInstruction);
      this.completionForm.earnedExp = maxExp;
      this.completeInstruction();
    },
    completeInstruction() {
      if (!this.currentUser || !this.activeInstruction) {
        return;
      }
      const maxExp = this.computeMaxExp(this.activeInstruction);
      const earned = Math.max(0, Math.min(Number(this.completionForm.earnedExp) || 0, maxExp));
      const userIndex = this.users.findIndex((u) => u.id === this.currentUser.id);
      if (userIndex === -1) {
        return;
      }
      const user = this.users[userIndex];
      if (!user.instructionResults) {
        user.instructionResults = {};
      }
      const prev = user.instructionResults[this.activeInstruction.id];
      const prevEarned = prev ? prev.earnedExp : 0;
      user.exp = (user.exp || 0) - prevEarned + earned;
      user.instructionResults[this.activeInstruction.id] = {
        earnedExp: earned,
      };
      if (!user.completedInstructions.includes(this.activeInstruction.id)) {
        user.completedInstructions.push(this.activeInstruction.id);
      }
      if (earned > 0) {
        user.lastCompletedAt = new Date().toISOString();
      }
      this.users.splice(userIndex, 1, user);
      this.currentUser = JSON.parse(JSON.stringify(user));
      this.saveState();
      const modalElement = document.getElementById("instructionModal");
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    },
    createInstruction() {
      const categories = this.instructionForm.categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const instruction = {
        id: `instr-${Date.now()}`,
        title: this.instructionForm.title,
        categories,
        collectionId: this.instructionForm.collectionId || "",
        groupId: this.currentUser ? this.currentUser.groupId : "group-1",
        slidesCount: this.instructionForm.slides,
        complexConnectionsCount: this.instructionForm.complexConnections,
        programComplexity: this.instructionForm.programComplexity,
        selfAssemblyBonus: this.instructionForm.selfAssembly,
        selfProgrammingBonus: this.instructionForm.selfProgramming,
        fixMalfunctionBonus: this.instructionForm.fixing,
        difficulty: this.instructionForm.difficulty,
        imageUrl: this.instructionForm.imageUrl || "https://via.placeholder.com/600x400?text=Инструкция",
        hasMotor: this.instructionForm.hasMotor,
        hasSensors: this.instructionForm.hasSensors,
        format: this.instructionForm.format,
      };
      this.instructions.push(instruction);
      this.saveState();
      this.instructionForm.title = "";
      this.instructionForm.categories = "";
      this.instructionForm.collectionId = "";
      this.instructionForm.slides = 10;
      this.instructionForm.complexConnections = 2;
      this.instructionForm.programComplexity = 3;
      this.instructionForm.selfAssembly = false;
      this.instructionForm.selfProgramming = false;
      this.instructionForm.fixing = false;
      this.instructionForm.difficulty = "easy";
      this.instructionForm.imageUrl = "";
      this.instructionForm.hasMotor = false;
      this.instructionForm.hasSensors = false;
      this.instructionForm.format = "pdf";
    },
    createCollection() {
      const name = this.collectionForm.name.trim();
      if (!name || !this.currentUser) {
        return;
      }
      const collection = {
        id: `col-${Date.now()}`,
        name,
        groupId: this.currentUser.groupId,
      };
      this.collections.push(collection);
      this.saveState();
      this.collectionForm.name = "";
    },
    collectionInstructionCount(collectionId) {
      return this.groupInstructions.filter((i) => i.collectionId === collectionId).length;
    },
    collectionCompletedCount(col) {
      if (!this.currentUser || !this.currentUser.completedInstructions) return 0;
      const instrIds = new Set(
        this.groupInstructions
          .filter((i) => i.collectionId === col.id)
          .map((i) => i.id)
      );
      return this.currentUser.completedInstructions.filter((id) => instrIds.has(id)).length;
    },
    collectionProgressPercent(col) {
      const total = this.collectionInstructionCount(col.id);
      if (!total) return 0;
      const done = this.collectionCompletedCount(col);
      return Math.min(100, Math.round((done / total) * 100));
    },
    isCollectionCompleted(col) {
      const total = this.collectionInstructionCount(col.id);
      if (!total) return false;
      const done = this.collectionCompletedCount(col);
      return done === total;
    },
    generateTeacherConfirmCode() {
      if (!this.currentUser || this.currentUser.role !== "admin") return;
      const index = this.users.findIndex((u) => u.id === this.currentUser.id);
      if (index === -1) return;
      const code = String(100000 + Math.floor(Math.random() * 900000));
      this.users[index].teacherConfirmCode = code;
      this.currentUser = JSON.parse(JSON.stringify(this.users[index]));
      this.saveState();
    },
    prolongUser(user, days) {
      const index = this.users.findIndex((u) => u.id === user.id);
      if (index === -1) return;
      const current = new Date(this.users[index].activeUntil || new Date());
      const updated = new Date(current.getTime() + 1000 * 60 * 60 * 24 * days);
      this.users[index].activeUntil = updated.toISOString();
      this.saveState();
      if (this.currentUser && this.currentUser.id === user.id) {
        this.currentUser = JSON.parse(JSON.stringify(this.users[index]));
      }
    },
    setUserActiveUntil(user, dateStr) {
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return;
      const index = this.users.findIndex((u) => u.id === user.id);
      if (index === -1) return;
      this.users[index].activeUntil = d.toISOString();
      this.saveState();
      if (this.currentUser && this.currentUser.id === user.id) {
        this.currentUser = JSON.parse(JSON.stringify(this.users[index]));
      }
    },
    formatDateForInput(isoStr) {
      if (!isoStr) return "";
      const d = new Date(isoStr);
      if (Number.isNaN(d.getTime())) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },
    deleteUser(user) {
      const index = this.users.findIndex((u) => u.id === user.id);
      if (index === -1) {
        return;
      }
      this.users[index].active = false;
      this.saveState();
      if (this.currentUser && this.currentUser.id === user.id) {
        this.logout();
      }
    },
    formatDate(value) {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("ru-RU");
    },
    loadState() {
      const raw = window.localStorage.getItem("robot-site-state");
      if (!raw) {
        this.seedInitialData();
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        const dropCollectionIds = new Set(["col-mini-car", "col-zoo-car", "col-halloween", "col-feb23"]);
        const isDemoInstruction = (instr) => {
          if (!instr || !instr.id) return false;
          if (instr.id.startsWith("instr-")) return true;
          if (dropCollectionIds.has(instr.collectionId)) return true;
          return false;
        };
        this.users = parsed.users || [];
        // Ensure new fields exist for old users
        this.users.forEach(u => {
          if (!u.completedInstructions) u.completedInstructions = [];
          if (!u.instructionResults) u.instructionResults = {};
          if (u.lastCompletedAt === undefined) u.lastCompletedAt = null;
          if (u.teacherConfirmCode === undefined) u.teacherConfirmCode = "";
          if (u.gender === undefined) u.gender = "";
          if (u.age === undefined) u.age = u.role === "user" ? 0 : 30;
          if (!u.createdAt && u.activeUntil) {
            const d = new Date(u.activeUntil);
            d.setDate(d.getDate() - 90);
            u.createdAt = d.toISOString();
          }
        });
        this.instructions = (parsed.instructions || []).filter((i) => !isDemoInstruction(i));
        // Нормализуем уровни сложности, чтобы у каждой инструкции была корректная сложность
        this.instructions.forEach((i) => {
          if (!i.difficulty) {
            i.difficulty = "easy";
          }
          if (i.difficulty === "advanced") {
            i.difficulty = "hard";
          }
        });

        // Если вдруг ни одна инструкция не помечена как "hard",
        // автоматически повышаем сложность у самых "навороченных" medium‑инструкций.
        let hardCount = this.instructions.filter((i) => i.difficulty === "hard").length;
        if (hardCount === 0) {
          const mediumCandidates = this.instructions.filter((i) => i.difficulty === "medium");
          mediumCandidates
            .sort((a, b) => {
              const score = (x) => {
                const slides = Number(x.slidesCount || x.slides || 0);
                const complex = Number(x.complexConnectionsCount || x.complexConnections || 0);
                const prog = Number(x.programComplexity || 0);
                const motor = x.hasMotor ? 1 : 0;
                const sensors = x.hasSensors ? 1 : 0;
                return slides + complex * 2 + prog * 3 + motor * 2 + sensors * 3;
              };
              return score(b) - score(a);
            })
            .slice(0, 6)
            .forEach((i) => {
              i.difficulty = "hard";
            });
        }
        this.collections = (parsed.collections || []).filter((c) => !dropCollectionIds.has(c.id));
        this.collections.forEach((c) => {
          if (!c.groupId) c.groupId = "group-1";
        });
        this.instructions.forEach((i) => {
          if (!i.groupId) i.groupId = "group-1";
        });
        if (Array.isArray(parsed.groups) && parsed.groups.length > 0) {
          this.groups = parsed.groups;
        }
      } catch {
        this.seedInitialData();
      }
    },
    saveState() {
      const payload = {
        users: this.users,
        instructions: this.instructions,
        collections: this.collections,
        groups: this.groups,
      };
      window.localStorage.setItem("robot-site-state", JSON.stringify(payload));
    },
    dedupeData() {
      const nameKey = (s) => String(s || "").trim().toLowerCase();
      const colKeepByName = new Map();
      const replaceId = new Map();
      for (const col of this.collections) {
        const key = nameKey(col.name);
        if (!key) continue;
        if (!colKeepByName.has(key)) {
          colKeepByName.set(key, col.id);
        } else {
          const keepId = colKeepByName.get(key);
          if (keepId !== col.id) {
            replaceId.set(col.id, keepId);
          }
        }
      }
      if (replaceId.size > 0) {
        this.instructions = this.instructions.map((i) => {
          const rep = replaceId.get(i.collectionId);
          if (rep) {
            return Object.assign({}, i, { collectionId: rep });
          }
          return i;
        });
        this.collections = this.collections.filter((c) => !replaceId.has(c.id));
      }
      const colIdToName = new Map(this.collections.map((c) => [c.id, c.name]));
      const groups = new Map();
      const score = (i) => {
        let s = 0;
        if (i && i.imageUrl && String(i.imageUrl).trim()) s += 10;
        if (i && i.imageUrl && String(i.imageUrl).includes("/Projectlego/img/")) s += 2;
        if (Array.isArray(i.steps) && i.steps.length > 0) s += 1;
        return s;
      };
      for (const instr of this.instructions) {
        const t = nameKey(instr.title);
        const cn = nameKey(colIdToName.get(instr.collectionId) || "");
        const k = t + "|" + cn;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(instr);
      }
      const keepIds = new Set();
      for (const arr of groups.values()) {
        if (arr.length === 1) {
          keepIds.add(arr[0].id);
          continue;
        }
        const sorted = arr.slice().sort((a, b) => score(b) - score(a));
        keepIds.add(sorted[0].id);
      }
      if (keepIds.size > 0) {
        this.instructions = this.instructions.filter((i) => keepIds.has(i.id));
      }
    },
    seedProjectlegoStatic() {
      const gid = "group-1";
      const ensureCollection = (id, name) => {
        const existing = this.collections.find((c) => c.id === id && (c.groupId || "group-1") === gid);
        if (!existing) {
          this.collections.push({ id, name, groupId: gid });
        } else {
          if (existing.name !== name) existing.name = name;
          if (!existing.groupId) existing.groupId = gid;
        }
      };
      const addInstruction = (instr) => {
        const withGroup = Object.assign({}, instr, { groupId: instr.groupId || gid });
        const idx = this.instructions.findIndex((i) => i.id === instr.id);
        if (idx === -1) {
          this.instructions.push(withGroup);
        } else {
          this.instructions[idx] = Object.assign({}, this.instructions[idx], withGroup);
        }
      };
      ensureCollection("col-pl-avto-mini", "Avto Mini");
      ensureCollection("col-pl-dino-park", "Dino Park");
      ensureCollection("col-pl-space-journey", "Space Journey");
      ensureCollection("col-pl-zoo-park", "Zoo Park");
      ensureCollection("col-pl-zoo-mini", "Zoo Mini");
      ensureCollection("col-pl-star-wars", "Star Wars");
      ensureCollection("col-pl-singles", "Projectlego: Инструкции");
      const easy = 12, med = 18;
      const mk = (id, title, cats, col, img, diff, motor = false, sensors = false, format = "pdf") => ({
        id, title, categories: cats, collectionId: col, groupId: gid,
        slidesCount: diff === "easy" ? easy : med,
        complexConnectionsCount: diff === "easy" ? 2 : 4,
        programComplexity: diff === "easy" ? 2 : 3,
        selfAssemblyBonus: true,
        selfProgrammingBonus: false,
        fixMalfunctionBonus: false,
        difficulty: diff,
        imageUrl: img,
        description: "",
        steps: [],
        hasMotor: motor,
        hasSensors: sensors,
        format: format,
      });
      const p = (name) => "/Projectlego/img/complect/" + name;
      [
        mk("pl-avto-mini-betmobil", "Бетмобиль", ["транспорт"], "col-pl-avto-mini", p("betmobil_mini.PNG"), "easy", true, false, "pdf"),
        mk("pl-avto-mini-velosiped", "Велосипед", ["транспорт"], "col-pl-avto-mini", p("velosiped_mini.PNG"), "easy", false, false, "pdf"),
        mk("pl-avto-mini-dzhip", "Джип", ["транспорт"], "col-pl-avto-mini", p("dzhip_mini.PNG"), "easy", true, false, "pdf"),
        mk("pl-avto-mini-mototsikl", "Мотоцикл", ["транспорт"], "col-pl-avto-mini", p("mototsikl_mini.PNG"), "easy", true, false, "pdf"),
        mk("pl-avto-mini-retromobil", "Ретромобиль", ["транспорт"], "col-pl-avto-mini", p("retromobil_mini.PNG"), "easy", true, false, "pdf"),
        mk("pl-avto-mini-scooter", "Скутер", ["транспорт"], "col-pl-avto-mini", p("scooter_mini.PNG"), "easy", true, false, "pdf"),
        mk("pl-avto-mini-traktor", "Трактор", ["транспорт"], "col-pl-avto-mini", p("traktor_mini.PNG"), "easy", true, false, "pdf"),
        mk("pl-avto-mini-tricikl", "Трицикл", ["транспорт"], "col-pl-avto-mini", p("tritsikl_mini.PNG"), "easy", true, false, "pdf"),
        mk("pl-avto-mini-chopper", "Чопер", ["транспорт"], "col-pl-avto-mini", p("chopper_mini.PNG"), "easy", true, false, "pdf"),
        mk("pl-dino-arthropleura", "Артроплевра", ["динозавры", "животные"], "col-pl-dino-park", p("arthropleura.jpg"), "medium", true, true, "video"),
        mk("pl-dino-golova", "Голова дино", ["динозавры", "животные"], "col-pl-dino-park", p("golova2.jpg"), "medium", false, false, "pdf"),
        mk("pl-dino-dimetrodon", "Диметродон", ["динозавры", "животные"], "col-pl-dino-park", p("dimetrodon.jpg"), "medium", true, true, "video"),
        mk("pl-dino-zavropod", "Завропод", ["динозавры", "животные"], "col-pl-dino-park", p("zavropod.jpg"), "medium", true, false, "pdf"),
        mk("pl-dino-megalodon", "Мегалодон", ["динозавры", "животные"], "col-pl-dino-park", p("megalodon.jpg"), "medium", true, false, "pdf"),
        mk("pl-dino-meiolaniya", "Миолания", ["динозавры", "животные"], "col-pl-dino-park", p("meiolaniya.jpg"), "medium", true, true, "pdf"),
        mk("pl-dino-mosasaur", "Мозазавр", ["динозавры", "животные"], "col-pl-dino-park", p("mosasaur.jpg"), "medium", true, false, "pdf"),
        mk("pl-dino-parazaurolof", "Паразауролоф", ["динозавры", "животные"], "col-pl-dino-park", p("parazaurolof.jpg"), "medium", true, true, "pdf"),
        mk("pl-dino-pleziozavr", "Плезиозавр", ["динозавры", "животные"], "col-pl-dino-park", p("pleziozavr.jpg"), "medium", true, false, "pdf"),
        mk("pl-dino-pterodon", "Птеродон", ["динозавры", "животные"], "col-pl-dino-park", p("pterodon.jpg"), "medium", true, true, "pdf"),
        mk("pl-dino-stegosaur", "Стегозавр", ["динозавры", "животные"], "col-pl-dino-park", p("stegosaur.jpg"), "medium", true, true, "pdf"),
        mk("pl-dino-tirannozaur", "Тираннозавр", ["динозавры", "животные"], "col-pl-dino-park", p("tirannozaur.jpg"), "medium", true, true, "video"),
        mk("pl-dino-triceratops", "Трицератопс", ["динозавры", "животные"], "col-pl-dino-park", p("triceratops.jpg"), "medium", true, true, "pdf"),
        mk("pl-space-inoplanetyanin", "Инопланетянин", ["космос", "тематические"], "col-pl-space-journey", p("inoplanetyanin.jpg"), "medium", true, true, "pdf"),
        mk("pl-space-scaut", "Скаут", ["космос", "тематические"], "col-pl-space-journey", p("scaut.jpg"), "medium", true, false, "pdf"),
        mk("pl-star-xving", "Звездолёт X-VING", ["космос", "тематические"], "col-pl-star-wars", p("xving.png"), "medium", true, false, "pdf"),
        mk("pl-star-battle", "Космическая битва", ["космос", "тематические"], "col-pl-star-wars", p("cosmoswar.jpg"), "medium", true, false, "pdf"),
        mk("pl-star-r2d2", "R2D2", ["космос", "тематические"], "col-pl-star-wars", p("r2d2.png"), "medium", true, true, "pdf"),
        mk("pl-zoo-bogomol", "Богомол", ["животные"], "col-pl-zoo-park", p("bogomol.jpg"), "medium", true, true, "pdf"),
        mk("pl-zoo-muha", "Муха", ["животные"], "col-pl-zoo-park", p("muha.jpg"), "medium", true, false, "pdf"),
        mk("pl-zoo-mini-shark", "Акула", ["животные"], "col-pl-zoo-mini", p("shark.png"), "easy", true, false, "pdf"),
        mk("pl-zoo-mini-butterfly", "Бабочка", ["животные"], "col-pl-zoo-mini", p("butterfly-mini.png"), "easy", false, false, "pdf"),
        mk("pl-zoo-mini-byk", "Бык", ["животные"], "col-pl-zoo-mini", p("byk.PNG"), "easy", true, false, "pdf"),
        mk("pl-zoo-mini-cat", "Кошка", ["животные"], "col-pl-zoo-mini", p("cat.png"), "easy", false, false, "pdf"),
        mk("pl-zoo-mini-kroko", "Крокодил", ["животные"], "col-pl-zoo-mini", p("kroko.png"), "easy", true, false, "pdf"),
        mk("pl-zoo-mini-forse", "Лошадка", ["животные"], "col-pl-zoo-mini", p("forse.PNG"), "easy", true, false, "pdf"),
        mk("pl-zoo-mini-muha", "Муха", ["животные"], "col-pl-zoo-mini", p("muha.jpg"), "easy", true, false, "pdf"),
        mk("pl-zoo-mini-monkey", "Обезьянка", ["животные"], "col-pl-zoo-mini", p("monkey.png"), "easy", true, false, "pdf"),
        mk("pl-zoo-mini-octopus", "Осьминог", ["животные"], "col-pl-zoo-mini", p("octopus-mini.png"), "easy", true, false, "pdf"),
        mk("pl-zoo-mini-panda", "Панда", ["животные"], "col-pl-zoo-mini", p("panda.png"), "easy", false, false, "pdf"),
        mk("pl-zoo-mini-spider", "Паук", ["животные"], "col-pl-zoo-mini", p("spider.png"), "easy", true, true, "pdf"),
        mk("pl-zoo-mini-parakeet", "Попугай", ["животные"], "col-pl-zoo-mini", p("parakeet.png"), "easy", false, false, "pdf"),
        mk("pl-zoo-mini-bee", "Пчела", ["животные"], "col-pl-zoo-mini", p("bee.png"), "easy", true, true, "pdf"),
        mk("pl-zoo-mini-fish", "Рыбка", ["животные"], "col-pl-zoo-mini", p("fish.PNG"), "easy", false, false, "pdf"),
        mk("pl-zoo-mini-dog", "Собака", ["животные"], "col-pl-zoo-mini", p("dog.png"), "easy", true, false, "pdf"),
        mk("pl-zoo-mini-owl", "Сова", ["животные"], "col-pl-zoo-mini", p("owl.PNG"), "easy", false, false, "pdf"),
        mk("pl-zoo-mini-dragonfly", "Стрекоза", ["животные"], "col-pl-zoo-mini", p("dragonfly.PNG"), "easy", true, true, "pdf"),
        mk("pl-zoo-mini-snail", "Улитка", ["животные"], "col-pl-zoo-mini", p("snail.png"), "easy", false, false, "pdf"),
        mk("pl-zoo-mini-duck", "Утка", ["животные"], "col-pl-zoo-mini", p("duck.PNG"), "easy", false, false, "pdf"),
        mk("pl-zoo-mini-tortila", "Черепашка", ["животные"], "col-pl-zoo-mini", p("tortila.png"), "easy", true, false, "pdf"),
        mk("pl-single-walle", "WALL-E", ["тематические"], "col-pl-singles", "/Projectlego/img/wally.PNG", "medium", true, true, "pdf"),
        mk("pl-single-tesla", "Tesla", ["тематические"], "col-pl-singles", "/Projectlego/img/tesla.png", "medium", true, false, "pdf"),
        mk("pl-single-catmouse", "Кот и мышка", ["тематические"], "col-pl-singles", "/Projectlego/img/complect/cat.png", "medium", true, true, "pdf"),
        mk("pl-single-tortila", "Черепашка", ["тематические"], "col-pl-singles", "/Projectlego/img/tortila.png", "medium", true, false, "pdf"),
      ].forEach(addInstruction);
      this.dedupeData();
      this.saveState();
    },
    async importProjectlego() {
      let importedAny = false;
      const gid = (this.currentUser && this.currentUser.groupId) || "group-1";
      try {
        const base = "/Projectlego/";
        const resp = await fetch(base + "index.html");
        if (!resp.ok) {
          return;
        }
        const text = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const pageLinks = Array.from(doc.querySelectorAll('a.complect__card[href^="pages/complect/"]'))
          .map((a) => a.getAttribute("href"))
          .filter(Boolean);
        const uniquePages = Array.from(new Set(pageLinks));
        const nameToCategories = (name) => {
          const n = (name || "").toLowerCase();
          if (n.includes("avto") || n.includes("auto")) return ["транспорт"];
          if (n.includes("dino")) return ["динозавры", "животные"];
          if (n.includes("zoo")) return ["животные"];
          if (n.includes("space")) return ["космос", "тематические"];
          if (n.includes("star")) return ["космос", "тематические"];
          return ["тематические"];
        };
        const slug = (s) =>
          String(s || "")
            .toLowerCase()
            .replace(/[^a-zA-ZА-Яа-я0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const ensureCollection = (name) => {
          const id = "col-pl-" + slug(name);
          if (!this.collections.find((c) => c.id === id && (c.groupId || "group-1") === gid)) {
            this.collections.push({ id, name, groupId: gid });
          }
          return id;
        };
        const addInstructionSafe = (instr) => {
          if (!this.instructions.find((i) => i.id === instr.id)) {
            this.instructions.push(instr);
            importedAny = true;
          }
        };
        for (const relPath of uniquePages) {
          const cleanedPath = relPath && relPath[0] === "/" ? relPath.slice(1) : relPath;
          const pagePath = base + cleanedPath;
          const r = await fetch(pagePath);
          if (!r.ok) continue;
          const html = await r.text();
          const d = parser.parseFromString(html, "text/html");
          const titleEl = d.querySelector("h2.title_h2");
          const collectionName = (titleEl && titleEl.textContent.trim()) || "Projectlego";
          const collectionId = ensureCollection(collectionName);
          const cards = Array.from(d.querySelectorAll(".complect__card"));
          for (const card of cards) {
            const imgEl = card.querySelector("img");
            const h3El = card.querySelector("h3");
            const title = (h3El && h3El.textContent.trim()) || "Без названия";
            const rawSrc = imgEl ? imgEl.getAttribute("src") : "";
            let imageUrl = "";
            try {
              imageUrl = new URL(rawSrc, pagePath).pathname;
            } catch {
              imageUrl = "";
            }
            const cats = nameToCategories(collectionName);
            const n = collectionName.toLowerCase();
            let difficulty = "easy";
            if (n.includes("mini") || n.includes("zoo")) difficulty = "easy";
            if (n.includes("avto") || n.includes("dino")) difficulty = "medium";
            if (n.includes("star") || n.includes("space")) difficulty = "medium";
            const slidesCount = difficulty === "easy" ? 12 : 18;
            const id = "pl-" + slug(collectionName) + "-" + slug(title);
            addInstructionSafe({
              id,
              title,
              categories: cats,
              collectionId,
              groupId: gid,
              slidesCount,
              complexConnectionsCount: difficulty === "easy" ? 2 : 4,
              programComplexity: difficulty === "easy" ? 2 : 3,
              selfAssemblyBonus: true,
              selfProgrammingBonus: false,
              fixMalfunctionBonus: false,
              difficulty,
              imageUrl,
              description: "",
              steps: [],
              hasMotor: n.includes("avto") || n.includes("star") || n.includes("dino"),
              hasSensors: n.includes("star") || n.includes("dino"),
              format: n.includes("dino") ? "video" : "pdf",
            });
          }
        }
        const h2s = Array.from(doc.querySelectorAll("h2.title_h2"));
        const h2Instr = h2s.find((el) => (el.textContent || "").trim().toLowerCase().includes("инструкции"));
        if (h2Instr) {
          let container = h2Instr.nextElementSibling;
          // Find nearest .complect__wrapper after the h2
          while (container && !container.classList.contains("complect__wrapper")) {
            container = container.nextElementSibling;
          }
          if (container) {
            const singleColId = ensureCollection("Projectlego: Инструкции");
            const cards = Array.from(container.querySelectorAll(".complect__card"));
            for (const card of cards) {
              const imgEl = card.querySelector("img");
              const h3El = card.querySelector("h3");
              const title = (h3El && h3El.textContent.trim()) || "Инструкция";
              const rawSrc = imgEl ? imgEl.getAttribute("src") : "";
              let imageUrl = "";
              try {
                imageUrl = new URL(rawSrc, base + "index.html").pathname;
              } catch {
                imageUrl = "";
              }
              const hasExt = (p) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(String(p || ""));
              if (!hasExt(imageUrl)) {
                const t = String(title || "").toLowerCase();
                if (t.includes("кот") && t.includes("мыш")) {
                  imageUrl = "/Projectlego/img/complect/cat.png";
                }
              }
              const id = "pl-single-" + slug(title);
              const tLow = title.toLowerCase();
              addInstructionSafe({
                id,
                title,
                categories: ["тематические"],
                collectionId: singleColId,
                slidesCount: 16,
                complexConnectionsCount: 3,
                programComplexity: 3,
                selfAssemblyBonus: true,
                selfProgrammingBonus: false,
                fixMalfunctionBonus: false,
                difficulty: "medium",
                imageUrl,
                description: "",
                steps: [],
                hasMotor: true,
                hasSensors: tLow.includes("робот") || tLow.includes("датчик"),
                format: "pdf",
              });
            }
          }
        }
      } catch (e) {
        console.warn("Projectlego import failed", e);
      } finally {
        this.dedupeData();
        if (importedAny) {
          this.saveState();
          window.localStorage.setItem("pl-imported-v1", "yes");
        } else {
          window.localStorage.removeItem("pl-imported-v1");
        }
      }
    },
    runImportNow() {
      try {
        window.localStorage.removeItem("pl-imported-v1");
      } catch {}
      this.importProjectlego();
    },
    seedInitialData() {
      const now = new Date();
      const long = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);
      this.groups = [
        {
          id: "group-1",
          code: "1234",
          name: "Мобильная робототехника и программирование роботов",
          teacherName: "Иванов Иван Иванович",
        },
      ];
      this.users = [
        {
          id: "user-demo",
          name: "Демонстрационный Ученик Тестович",
          login: "user",
          password: "user",
          role: "user",
          groupId: "group-1",
          exp: 0,
          completedInstructions: [],
          instructionResults: {},
          teacherConfirmCode: "",
          lastCompletedAt: null,
          active: true,
          activeUntil: long.toISOString(),
          createdAt: now.toISOString(),
          gender: "male",
          age: 9,
        },
        {
          id: "admin-demo",
          name: "Иванов Иван Иванович",
          login: "admin",
          password: "admin",
          role: "admin",
          groupId: "group-1",
          exp: 0,
          completedInstructions: [],
          instructionResults: {},
          teacherConfirmCode: "",
          lastCompletedAt: null,
          active: true,
          activeUntil: long.toISOString(),
          createdAt: now.toISOString(),
          age: 35,
        },
        {
          id: "moderator-demo",
          name: "Создатель сайта",
          login: "moderator",
          password: "moderator",
          role: "moderator",
          groupId: "group-1",
          exp: 0,
          completedInstructions: [],
          instructionResults: {},
          teacherConfirmCode: "",
          lastCompletedAt: null,
          active: true,
          activeUntil: long.toISOString(),
          createdAt: now.toISOString(),
          age: 30,
        },
      ];
      this.collections = [];
      this.instructions = [];
      if (!this.groups || this.groups.length === 0) {
        this.groups = [
          { id: "group-1", code: "1234", name: "Мобильная робототехника и программирование роботов", teacherName: "Иванов Иван Иванович" },
        ];
      }
      this.saveState();
    },
  },
  mounted() {
    this.loadState();
    this.seedProjectlegoStatic();
    const savedTheme = window.localStorage.getItem("site-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      this.theme = savedTheme;
    }
    this.applyTheme();
    this.importProjectlego();
    this._clickOutsideHandler = (e) => {
      const target = e.target;
      if (!target.closest || !target.closest(".pretty-select")) {
        this.closeAllSelects();
      }
    };
    window.addEventListener("click", this._clickOutsideHandler);
  },
  unmounted() {
    if (this._clickOutsideHandler) {
      window.removeEventListener("click", this._clickOutsideHandler);
    }
  },
};

Vue.createApp(App).mount("#app");
