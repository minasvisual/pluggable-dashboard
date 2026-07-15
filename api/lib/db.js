import { Sequelize, DataTypes } from 'sequelize';

let sequelize;
let Model;

export function getDatabase() {
  if (!sequelize) {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      sequelize = new Sequelize(dbUrl, {
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        logging: false
      });
    } else {
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: 'db.sqlite',
        logging: false
      });
    }

    Model = sequelize.define('Model', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      domain: {
        type: DataTypes.STRING,
        allowNull: false
      },
      content: {
        type: DataTypes.JSON,
        allowNull: true
      }
    }, {
      tableName: 'models',
      timestamps: true
    });
  }

  return { sequelize, Model };
}
