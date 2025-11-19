const Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * createTable() => "users", deps: []
 * createTable() => "conversations", deps: [users]
 * createTable() => "messages", deps: [conversations, users]
 * createTable() => "folders", deps: [folders, users]
 * createTable() => "files", deps: [users, folders]
 * createTable() => "conversation_files", deps: [conversations, files]
 *
 */

const info = {
  revision: 1,
  name: "initial",
  created: "2025-11-19T17:17:05.853Z",
  comment: "",
};

const migrationCommands = (transaction) => [
  {
    fn: "createTable",
    params: [
      "users",
      {
        id: {
          type: Sequelize.UUID,
          field: "id",
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        email: {
          type: Sequelize.STRING,
          field: "email",
          unique: true,
          allowNull: false,
        },
        passwordHash: {
          type: Sequelize.STRING,
          field: "password_hash",
          allowNull: false,
        },
        name: { type: Sequelize.STRING, field: "name", allowNull: false },
        organization: { type: Sequelize.STRING, field: "organization" },
        createdAt: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "conversations",
      {
        id: {
          type: Sequelize.UUID,
          field: "id",
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        title: { type: Sequelize.STRING, field: "title", allowNull: false },
        description: { type: Sequelize.TEXT, field: "description" },
        userId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "users", key: "id" },
          field: "user_id",
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "messages",
      {
        id: {
          type: Sequelize.UUID,
          field: "id",
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        role: {
          type: Sequelize.ENUM("user", "assistant", "system"),
          field: "role",
          allowNull: false,
        },
        content: { type: Sequelize.TEXT, field: "content", allowNull: false },
        metadata: {
          type: Sequelize.JSONB,
          field: "metadata",
          defaultValue: Sequelize.Object,
        },
        conversationId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "conversations", key: "id" },
          field: "conversation_id",
          allowNull: false,
        },
        userId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "users", key: "id" },
          field: "user_id",
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "folders",
      {
        id: {
          type: Sequelize.UUID,
          field: "id",
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        name: { type: Sequelize.STRING, field: "name", allowNull: false },
        referencePath: {
          type: Sequelize.STRING,
          field: "reference_path",
          allowNull: false,
        },
        parentId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "folders", key: "id" },
          field: "parent_id",
          allowNull: true,
        },
        ownerId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "users", key: "id" },
          field: "owner_id",
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "files",
      {
        id: {
          type: Sequelize.UUID,
          field: "id",
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        name: { type: Sequelize.STRING, field: "name", allowNull: false },
        originalName: {
          type: Sequelize.STRING,
          field: "original_name",
          allowNull: false,
        },
        mimeType: {
          type: Sequelize.STRING,
          field: "mime_type",
          allowNull: false,
        },
        size: { type: Sequelize.INTEGER, field: "size", allowNull: false },
        storagePath: {
          type: Sequelize.STRING,
          field: "storage_path",
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM("pending", "processing", "ready", "failed"),
          field: "status",
          defaultValue: "pending",
        },
        metadata: {
          type: Sequelize.JSONB,
          field: "metadata",
          defaultValue: Sequelize.Object,
        },
        error: { type: Sequelize.TEXT, field: "error" },
        ownerId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "users", key: "id" },
          field: "owner_id",
          allowNull: false,
        },
        folderId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "folders", key: "id" },
          field: "folder_id",
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "conversation_files",
      {
        id: {
          type: Sequelize.UUID,
          field: "id",
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        conversationId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "conversations", key: "id" },
          unique: "conversation_files_fileId_conversationId_unique",
          field: "conversation_id",
          allowNull: false,
        },
        fileId: {
          type: Sequelize.UUID,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "files", key: "id" },
          unique: "conversation_files_fileId_conversationId_unique",
          field: "file_id",
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
];

const rollbackCommands = (transaction) => [
  {
    fn: "dropTable",
    params: ["users", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["conversations", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["messages", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["folders", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["files", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["conversation_files", { transaction }],
  },
];

const pos = 0;
const useTransaction = true;

const execute = (queryInterface, sequelize, _commands) => {
  let index = pos;
  const run = (transaction) => {
    const commands = _commands(transaction);
    return new Promise((resolve, reject) => {
      const next = () => {
        if (index < commands.length) {
          const command = commands[index];
          console.log(`[#${index}] execute: ${command.fn}`);
          index++;
          queryInterface[command.fn](...command.params).then(next, reject);
        } else resolve();
      };
      next();
    });
  };
  if (useTransaction) return queryInterface.sequelize.transaction(run);
  return run(null);
};

module.exports = {
  pos,
  useTransaction,
  up: (queryInterface, sequelize) =>
    execute(queryInterface, sequelize, migrationCommands),
  down: (queryInterface, sequelize) =>
    execute(queryInterface, sequelize, rollbackCommands),
  info,
};
