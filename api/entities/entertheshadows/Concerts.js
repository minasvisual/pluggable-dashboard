/* jshint indent: 2 */

module.exports = (sequelize, DataTypes, DB) => {
  
    if( DB !== 'entertheshadows' ) return false;

    let Model = sequelize.define('EtsConcerts', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      code:	DataTypes.STRING(255),	
      name:	DataTypes.STRING(255),	
      type: DataTypes.STRING(255),
      status:	DataTypes.STRING(255),
      uri:	DataTypes.STRING(255),
      start:	DataTypes.DATE,
      end:	DataTypes.DATE,
      ageRestriction:	DataTypes.STRING(100),
      local:	DataTypes.STRING(255),
      city:	DataTypes.STRING(100),
      country:	DataTypes.STRING(100),
      lat:	DataTypes.STRING(100),
      lng:	DataTypes.STRING(100),
      performance:	DataTypes.STRING(512),
    }, {
      tableName: 'events',
      createdAt: false,
      updatedAt: 'updateAt',
      underscored: false,
      paranoid: false, 
    });
  
    Model.DB_TARGET = 'entertheshadows'
  
    Model.associate = models => {
        Model.belongsToMany(models.EtsArtists, {
          through: 'artists_events',
          as: 'artists',
          foreignKey: 'event_id'
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
  