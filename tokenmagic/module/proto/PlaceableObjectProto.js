import { PlaceableType, Magic, broadcast, SocketAction, mustBroadCast, isZOrderConfig } from "../tokenmagic.js";
import { emptyPreset, autoMinRank } from '../constants.js';

export var gMaxRank = autoMinRank;

PlaceableObject.prototype.TMFXaddFilters = async function (paramsArray, replace = false) {
    await Magic.addFilters(this, paramsArray, replace);
}

PlaceableObject.prototype.TMFXupdateFilters = async function (paramsArray) {
    await Magic.updateFiltersByPlaceable(this, paramsArray);
}

PlaceableObject.prototype.TMFXaddUpdateFilters = async function (paramsArray) {
    await Magic.addUpdateFilters(this, paramsArray);
}

PlaceableObject.prototype.TMFXdeleteFilters = async function (filterId = null) {
    await Magic.deleteFilters(this, filterId);
}

PlaceableObject.prototype.TMFXhasFilterType = function (filterType) {
    return Magic.hasFilterType(this, filterType);
}

PlaceableObject.prototype.TMFXhasFilterId = function (filterId) {
    return Magic.hasFilterId(this, filterId);
}

PlaceableObject.prototype._TMFXsetFlag = async function (flag) {
    if (mustBroadCast()) broadcast(this, flag, SocketAction.SET_FLAG);
    else await this.setFlag("tokenmagic", "filters", flag);
}

PlaceableObject.prototype._TMFXsetAnimeFlag = async function (flag) {
    if (mustBroadCast()) broadcast(this, flag, SocketAction.SET_ANIME_FLAG);
    else await this.setFlag("tokenmagic", "animeInfo", flag);
}

PlaceableObject.prototype._TMFXunsetFlag = async function () {
    if (mustBroadCast()) broadcast(this, null, SocketAction.SET_FLAG);
    else await this.unsetFlag("tokenmagic", "filters");
}

PlaceableObject.prototype._TMFXunsetAnimeFlag = async function () {
    if (mustBroadCast()) broadcast(this, null, SocketAction.SET_ANIME_FLAG);
    else await this.unsetFlag("tokenmagic", "animeInfo");
}

PlaceableObject.prototype._TMFXgetSprite = function () {

    switch (this.constructor.embeddedName) {
        case PlaceableType.TOKEN:
            return this.icon;
        case PlaceableType.TILE:
            return this.tile.img;
        case PlaceableType.TEMPLATE:
            return this.template;
        case PlaceableType.DRAWING:
            return this.drawing || this.img;
        default:
            return null;
    }
}

PlaceableObject.prototype._TMFXgetPlaceablePadding = function () {
    // get the placeable padding, by taking into account all filters and options
    var accPadding = 0;
    const filters = this._TMFXgetSprite().filters;
    if (filters instanceof Array) {
        // "for (const) of" has performance advantage
        for (const filter of filters) {
            if (canvas.app.renderer.filter.useMaxPadding) {
                accPadding = Math.max(accPadding, filter.padding);
            } else {
                accPadding += filter.padding;
            }
        }
    }
    return accPadding;
}

PlaceableObject.prototype._TMFXcheckSprite = function () {

    switch (this.constructor.embeddedName) {
        case PlaceableType.TOKEN:
            return (this.hasOwnProperty("icon")
                && !(this.icon == null));
        case PlaceableType.TILE:
            return (this.hasOwnProperty("tile")
                && this.tile.hasOwnProperty("img")
                && !(this.tile.img == null));
        case PlaceableType.TEMPLATE:
            return (this.hasOwnProperty("template")
                && !(this.template == null));
        case PlaceableType.DRAWING:
            return (this.hasOwnProperty("drawing")
                && !(this.drawing == null))
                || (this.hasOwnProperty("img")
                    && !(this.img == null));
        default:
            return null;
    }
}

PlaceableObject.prototype._TMFXgetMaxFilterRank = function () {
    const sprite = this._TMFXgetSprite();
    if (sprite == null) { return (gMaxRank++); }
    if (sprite.filters == null) {
        return (gMaxRank++);
    } else {
        let maxRank = Math.max(...sprite.filters.map(f => f.rank), autoMinRank);
        gMaxRank = Math.max(maxRank, gMaxRank) + 1;
        return gMaxRank;
    }
}

PlaceableObject.prototype._TMFXsetRawFilters = function (filters) {

    function insertFilter(filters) {
        function filterZOrderCompare(a, b) {
            if (a.zOrder < b.zOrder) return -1;
            if (a.zOrder > b.zOrder) return 1;
            return 0;
        }

        function filterRankCompare(a, b) {
            if (a.rank < b.rank) return -1;
            if (a.rank > b.rank) return 1;
            return 0;
        }

        if (!isZOrder) {
            if (!filters.hasOwnProperty("rank")) {
                let maxRank = Math.max(...sprite.filters.map(f => f.rank), autoMinRank);
                filters.rank = maxRank + 1;
            }
        }

        sprite.filters.push(filters);
        isZOrder ? sprite.filters.sort(filterZOrderCompare)
            : sprite.filters.sort(filterRankCompare);
    }

    function addFilter(filters) {
        if (!isZOrder && !filters.hasOwnProperty("rank")) {
            filters.rank = autoMinRank;
        }
        sprite.filters = [filters];
    }

    const isZOrder = isZOrderConfig();
    const sprite = this._TMFXgetSprite();
    if (sprite == null) { return false; }

    if (filters == null) {
        sprite.filters = null;
    } else {
        sprite.filters == null
            ? addFilter(filters)
            : insertFilter(filters);
    }

    return true;
}

PlaceableObject.prototype._TMFXunsetRawFilters = function () {
    return this._TMFXsetRawFilters(null);
}

PlaceableObject.prototype._TMFXgetPlaceableType = function () {
    if ([PlaceableType.TOKEN, PlaceableType.TILE, PlaceableType.TEMPLATE, PlaceableType.DRAWING]
        .includes(this.constructor.embeddedName)) return this.constructor.embeddedName;

    return PlaceableType.NOT_SUPPORTED;
}

export function enableMeasuredTemplatePrototypeUpdate() {
    libWrapper.register('tokenmagic', 'MeasuredTemplate.prototype.update', function (wrapped, ...args) {
        const data = args[0];
        const hasTexture = data.hasOwnProperty("texture");
        const hasPresetData = data.hasOwnProperty("tmfxPreset");
        if (hasPresetData && data.tmfxPreset !== emptyPreset) {
            let defaultTexture = Magic._getPresetTemplateDefaultTexture(data.tmfxPreset);
            if (!(defaultTexture == null)) {
                if (data.texture === '' || data.texture.includes('/modules/tokenmagic/fx/assets/templates/'))
                    data.texture = defaultTexture;
            }

        } else if (hasTexture && data.texture.includes('/modules/tokenmagic/fx/assets/templates/')
            && hasPresetData && data.tmfxPreset === emptyPreset) {
            data.texture = '';
        }

        return wrapped(...args);
    }, 'WRAPPER');
}

export function measuredTemplateRefreshHotfix(tpl, wrapped, ...args) {
    // Temporary fix for upstream issue rendering destroyed templates
    if (tpl.template && !tpl.template._destroyed) {
        return wrapped(...args);
    }
    return tpl;
}