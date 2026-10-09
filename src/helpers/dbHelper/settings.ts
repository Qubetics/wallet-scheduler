import * as Models from '../../models/model/index';

class SettingsQueries {

    public async settingsFindOne(attr: any, where_clause: any) {
        try {
            const data: any = await Models.SettingsModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in settings_find_one>>", err)
            throw err;
        }
    }

}

const settingsQueries = new SettingsQueries();
export default settingsQueries;
