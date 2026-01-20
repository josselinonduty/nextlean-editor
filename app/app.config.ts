export default defineAppConfig({
  ui: {
    colors: {
      primary: "indigo",
      neutral: "slate",
    },
    button: {
      defaultVariants: {
        color: "primary",
      },
    },
    card: {
      slots: {
        root: "bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800",
      },
    },
    navigationMenu: {
      slots: {
        link: "group relative flex items-center gap-2 font-medium text-sm before:absolute before:inset-y-2 before:inset-x-0 before:rounded-md hover:before:bg-gray-100 dark:hover:before:bg-gray-800",
        linkActive:
          "text-primary before:bg-primary/10 dark:before:bg-primary/10",
      },
    },
  },
});
