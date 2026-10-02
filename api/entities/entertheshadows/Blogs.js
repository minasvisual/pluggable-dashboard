
module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsBlogs', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      account_id:	DataTypes.INTEGER(11),	
      title: DataTypes.STRING(255),
      content: DataTypes.STRING(2048),
      cover:	DataTypes.STRING(255),
      artists:	DataTypes.STRING(255),
      category:	DataTypes.INTEGER(11),
      source:	DataTypes.STRING(255),
      language:	DataTypes.STRING(20),
      status:	DataTypes.BOOLEAN,
    }, {
      tableName: 'blog',
      createdAt: 'createdAt',
      deletedAt: 'deletedAt',
      updatedAt: false,
      underscored: false,
      paranoid: true, 
      defaultScope:{  
          where: { status: true }
      },
      scopes:{
        blocked: () => ({
          where: { status: [true,false] }
        })
      }
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.belongsTo(models.EtsProviders, {
          as: 'account',
          foreignKey: 'account_id'
        }); 
        Model.belongsToMany(models.EtsArtists, {
          through: 'artists_blogs',
          as: 'artist',
          foreignKey: 'blog_id'
        }); 
        // Model.afterCreate( async (instance) => {
        //   let qr =  await sequelize.query("SELECT @eid := id, @link := link, @city := city, @date := initdate  FROM events_dev WHERE id = "+instance.id+"; "+
        //                                   "DELETE FROM events_dev WHERE link = @link and city = @city and initdate = @date and id <> @eid;", 
        //                                   { type: sequelize.QueryTypes.SELECT }
        //                   )
          
        //   models.Logs.create({ user_id: 1, level: 'log', url: 'nightfy/events/batch-delete', data: qr})
        // })
    }
    return Model;
  };