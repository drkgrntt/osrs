package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Item struct {
	Id           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Title        string             `json:"title,omitempty"`
	Slug         string             `json:"slug,omitempty"`
	Description  string             `json:"description,omitempty"`
	ScrapedOn    time.Time          `json:"scrapedOn,omitempty"`
	MainImage    string             `json:"mainImage,omitempty"`
	TextBoxImage string             `json:"TextBoxImage,omitempty"`

	// Info Box
	// Strings
	Size               string `json:"size,omitempty"`
	Element            string `json:"element,omitempty"`
	Examine            string `json:"examine,omitempty"`
	Effect             string `json:"effect,omitempty"`
	Attribute          string `json:"attribute,omitempty"`
	Race               string `json:"race,omitempty"`
	Gender             string `json:"gender,omitempty"`
	Type               string `json:"type,omitempty"`
	Tool               string `json:"tool,omitempty"`
	Trap               string `json:"trap,omitempty"`
	League             string `json:"league,omitempty"`
	Duration           string `json:"duration,omitempty"`
	Composer           string `json:"composer,omitempty"`
	Location           string `json:"location,omitempty"`
	Locations          string `json:"locations,omitempty"`
	Tutorial           string `json:"tutorial,omitempty"`
	Quest              string `json:"quest,omitempty"`
	Room               string `json:"room,omitempty"`
	Destroy            string `json:"destroy,omitempty"`
	Seed               string `json:"seed,omitempty"`
	Plant              string `json:"plant,omitempty"`
	Cost               string `json:"cost,omitempty"`
	Crop               string `json:"crop,omitempty"`
	Category           string `json:"category,omitempty"`
	Turael             string `json:"turael,omitempty"`
	Spira              string `json:"spira,omitempty"`
	Krystilia          string `json:"krystilia,omitempty"`
	Mazchna            string `json:"mazchna,omitempty"`
	Role               string `json:"role,omitempty"`
	Founder            string `json:"founder,omitempty"`
	Team               string `json:"team,omitempty"`
	Vannaka            string `json:"vannaka,omitempty"`
	Chaeldar           string `json:"chaeldar,omitempty"`
	Amunition          string `json:"amunition,omitempty"`
	Konar              string `json:"konar,omitempty"`
	Album              string `json:"album,omitempty"`
	Nieve              string `json:"nieve,omitempty"`
	Bait               string `json:"bait,omitempty"`
	Duradel            string `json:"duradel,omitempty"`
	Facility           string `json:"facility,omitempty"`
	Monster            string `json:"monster,omitempty"`
	Spellbook          string `json:"spellbook,omitempty"`
	Tier               string `json:"tier,omitempty"`
	Yield              string `json:"yield,omitempty"`
	Owner              string `json:"owner,omitempty"`
	Specialty          string `json:"specialty,omitempty"`
	Patch              string `json:"patch,omitempty"`
	RespawnTime        string `json:"respawnTime,omitempty"`
	WildernessLevel    string `json:"wildernessLevel,omitempty"`
	RewardCurrency     string `json:"rewardCurrency,omitempty"`
	UnlockHint         string `json:"unlockHint,omitempty"`
	AgilityCourse      string `json:"agilityCourse,omitempty"`
	QuestSeries        string `json:"questSeries,omitempty"`
	GrowthTime         string `json:"growthTime,omitempty"`
	OtherRequirements  string `json:"otherRequirements,omitempty"`
	FurnitureName      string `json:"furnitureName,omitempty"`
	DrainRate          string `json:"drainRate,omitempty"`
	CombatLevel        string `json:"combatLevel,omitempty"`
	InfoDescription    string `json:"infoDescription,omitempty"`
	RequiredTool       string `json:"requiredTool,omitempty"`
	OfficialDifficulty string `json:"officialDifficulty,omitempty"`
	FishingSpot        string `json:"fishingSpot,omitempty"`
	CurrentLeader      string `json:"currentLeader,omitempty"`
	SocialMedia        string `json:"socialMedia,omitempty"`
	UsesItem           string `json:"usesItem,omitempty"`

	// Numbers
	Participants      float64 `json:"participants,omitempty"`
	Value             float64 `json:"value,omitempty"`
	Weight            float64 `json:"weight,omitempty"`
	Level             float64 `json:"level,omitempty"`
	Experience        float64 `json:"experience,omitempty"`
	Floors            float64 `json:"floors,omitempty"`
	Exchange          float64 `json:"exchange,omitempty"`
	MaxHit            float64 `json:"maxHit,omitempty"`
	MonsterId         float64 `json:"monsterId,omitempty"`
	HighAlch          float64 `json:"highAlch,omitempty"`
	LowAlch           float64 `json:"lowAlch,omitempty"`
	BuyLimit          float64 `json:"buyLimit,omitempty"`
	DailyVolume       float64 `json:"dailyVolume,omitempty"`
	NpcId             float64 `json:"npcId,omitempty"`
	ObjectId          float64 `json:"objectId,omitempty"`
	ItemId            float64 `json:"itemId,omitempty"`
	SeedsPer          float64 `json:"seedsPer,omitempty"`
	ConstructionLevel float64 `json:"constructionLevel,omitempty"`
	IconId            float64 `json:"iconId,omitempty"`
	IconItemId        float64 `json:"iconItemId,omitempty"`
	WikisyncId        float64 `json:"wikisyncId,omitempty"`
	LevelRequired     float64 `json:"levelRequired,omitempty"`
	AgilityXp         float64 `json:"agilityXp,omitempty"`
	SlayerLevel       float64 `json:"slayerLevel,omitempty"`
	SlayerXp          float64 `json:"slayerXp,omitempty"`
	ThievingXp        float64 `json:"thievingXp,omitempty"`
	PrayerXp          float64 `json:"prayerXp,omitempty"`
	ConstructionXp    float64 `json:"constructionXp,omitempty"`
	WoodcuttingXp     float64 `json:"woodcuttingXp,omitempty"`
	FiremakingXp      float64 `json:"firemakingXp,omitempty"`
	HunterXp          float64 `json:"hunterXp,omitempty"`
	MiningXp          float64 `json:"miningXp,omitempty"`
	CastingSpeed      float64 `json:"castingspeed,omitempty"`
	BaseMaxHit        float64 `json:"baseMaxHit,omitempty"`
	FishingXp         float64 `json:"fishingXp,omitempty"`
	XpBonus           float64 `json:"xpBonus,omitempty"`
	StrengthXp        float64 `json:"strengthXp,omitempty"`
	PushDuration      float64 `json:"pushDuration,omitempty"`
	PlantingXp        float64 `json:"plantingXp,omitempty"`
	CheckingXp        float64 `json:"checkingXp,omitempty"`
	HarvestingXp      float64 `json:"harvestingXp,omitempty"`

	// Dates
	Removal  *time.Time `json:"removal"`
	Released *time.Time `json:"released"`
	Employed *time.Time `json:"employed"`

	// Booleans
	Members         bool `json:"members,omitempty"`
	Aggressive      bool `json:"aggressive,omitempty"`
	Poisonous       bool `json:"poisonous,omitempty"`
	Tradeable       bool `json:"tradeable,omitempty"`
	Bankable        bool `json:"bankable,omitempty"`
	Payment         bool `json:"payment,omitempty"`
	Edible          bool `json:"edible,omitempty"`
	Equipable       bool `json:"equipable,omitempty"`
	Stackable       bool `json:"stackable,omitempty"`
	StacksInBank    bool `json:"stacksInBank,omitempty"`
	Regrow          bool `json:"regrow,omitempty"`
	Noteable        bool `json:"noteable,omitempty"`
	Flatpackable    bool `json:"flatpackable,omitempty"`
	Retaliation     bool `json:"retaliation,omitempty"`
	PoisonImmunity  bool `json:"poisonImmunity,omitempty"`
	VenomImmunity   bool `json:"venomImmunity,omitempty"`
	CannonsImmunity bool `json:"cannonsImmunity,omitempty"`
	ThrallsImmunity bool `json:"thrallsImmunity,omitempty"`
	QuestItem       bool `json:"questItem,omitempty"`
	TwoHanded       bool `json:"twoHanded,omitempty"`

	// String slices
	Skills         []string `json:"skills,omitempty"`
	Options        []string `json:"options,omitempty"`
	Music          []string `json:"music,omitempty"`
	Headquarters   []string `json:"headquarters,omitempty"`
	Inhabitants    []string `json:"inhabitants,omitempty"`
	Hotspot        []string `json:"hotspot,omitempty"`
	Shop           []string `json:"shop,omitempty"`
	Platforms      []string `json:"platforms,omitempty"`
	Products       []string `json:"products,omitempty"`
	Instruments    []string `json:"instruments,omitempty"`
	Teleports      []string `json:"teleports,omitempty"`
	AttackStyle    []string `json:"attackStyle,omitempty"`
	WornOptions    []string `json:"wornOptions,omitempty"`
	AlsoCalled     []string `json:"alsoCalled,omitempty"`
	BuildType      []string `json:"buildType,omitempty"`
	LeadDevelopers []string `json:"leadDevelopers,omitempty"`

	// Image Sources
	Icon        string `json:"icon,omitempty"`
	MinimapIcon string `json:"minimapIcon,omitempty"`
	MapIcon     string `json:"mapIcon,omitempty"`
}
