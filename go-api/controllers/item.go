package controllers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/drkgrntt/osrs/go-api/models"
	"github.com/drkgrntt/osrs/go-api/utils"
	"github.com/gin-gonic/gin"
	"github.com/gocolly/colly"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/net/html"
)

type ItemController struct {
	DB *mongo.Database
}

func CreateItemController(DB *mongo.Database) ItemController {
	return ItemController{DB}
}

func (c *ItemController) LoadItemRoutes(rg *gin.RouterGroup) {
	router := rg.Group("items")
	router.GET("/:slug", c.GetItemBySlug)
	router.GET("/search/:searchTerm", c.GetItemsBySearchTerm)
}

func (c *ItemController) GetItemBySlug(ctx *gin.Context) {
	slug := ctx.Params.ByName("slug")

	var item models.Item
	c.DB.Collection("item").
		FindOne(context.TODO(), bson.D{{Key: "slug", Value: slug}}).
		Decode(&item)
	item.Convert()

	ctx.JSON(http.StatusOK, gin.H{"item": item})
}

func (c *ItemController) GetItemsBySearchTerm(ctx *gin.Context) {
	searchTerm := ctx.Params.ByName("searchTerm")

	var matches []interface{}

	opts := options.Find().SetSort(bson.D{{
		Key: "score",
		Value: bson.D{{
			Key: "$meta", Value: "textScore",
		}},
	}}).SetLimit(20)

	cursor, err := c.DB.Collection("item").
		Find(
			context.TODO(),
			bson.D{{
				Key: "$text",
				Value: bson.D{{
					Key:   "$search",
					Value: fmt.Sprintf("\"%s\"", searchTerm),
				}},
			}},
			opts,
		)

	if err != nil {
		log.Fatal("Error on find: ", err)
	}

	// Close the cursor once finished
	defer cursor.Close(context.TODO())

	for cursor.Next(context.TODO()) {
		var elem models.Item
		cursor.Decode(&elem)
		elem.Convert()
		matches = append(matches, &elem)
	}

	if err := cursor.Err(); err != nil {
		log.Fatal("Error on cursor: ", err)
	}

	// regex, _ := regexp.Compile(fmt.Sprintf("(?i)%s", searchTerm))
	// opts = options.Find().SetLimit(20)
	// cursor, err = c.DB.Collection("item").
	// 	Find(
	// 		context.TODO(),
	// 		bson.D{{
	// 			Key: "_id",
	// 			Value: bson.D{{
	// 				Key:   "$nin",
	// 				Value: fmt.Sprintf("\"%s\"", searchTerm),
	// 			}},
	// 		}},
	// 		opts,
	// 	)

	// if err != nil {
	// 	log.Fatal(err)
	// }

	// var result models.Item
	// b, err := json.Marshal(matches)
	// if err != nil {
	// 	log.Fatal("Error on json marshal: ", err)
	// }
	// b = bytes.Replace(b, []byte(":NaN"), []byte(":null"), -1)
	// err = json.Unmarshal(b, &result)
	// if err != nil {
	// 	log.Fatal("Error on json unmarshal: ", err)
	// }

	ctx.JSON(http.StatusOK, gin.H{"items": matches})
}

var BASE_URL = "https://oldschool.runescape.wiki"
var RANDOM_PAGE = "Special:Random/main"

func ScrapeRandom() {
	Scrape(RANDOM_PAGE)
}

func Scrape(pageName string) {
	c := colly.NewCollector()

	c.OnHTML("body", func(e *colly.HTMLElement) {
		parseWikiPageHtml(e.DOM)
	})

	c.OnRequest(func(r *colly.Request) {
		fmt.Println("Scraping ", r.URL)
	})

	url := fmt.Sprintf("%s/w/%s", BASE_URL, pageName)
	c.Visit(url)
}

func parseWikiPageHtml(dom *goquery.Selection) {
	var item models.Item
	now := time.Now()

	item.ScrapedOn = &now
	item.Title = dom.Find("#firstHeading").Text()
	item.Slug = strings.ReplaceAll(strings.ToLower(item.Title), " ", "_")

	// Images
	if src, exists := dom.Find(".mw-parser-output .infobox .infobox-image img").Attr("src"); exists {
		item.MainImage = fmt.Sprintf("%s%s", BASE_URL, src)
	}
	if src, exists := dom.Find(".mw-parser-output .image img").Attr("src"); exists {
		item.TextBoxImage = fmt.Sprintf("%s%s", BASE_URL, src)
		if item.TextBoxImage == item.MainImage {
			item.TextBoxImage = ""
		}
	}

	// Description
	content := dom.Find(".mw-parser-output")
	descriptionStrings := content.Children().Map(func(_ int, element *goquery.Selection) string {
		if id, _ := element.Attr("id"); id == "toc" {
			return ""
		}

		if len(element.Nodes) > 0 && element.Nodes[0].Type == html.ElementNode && element.Nodes[0].Data == "p" {
			return element.Text()
		}

		return ""
	})
	filteredDescriptionStrings := []string{}
	for _, descStr := range descriptionStrings {
		if descStr != "" {
			filteredDescriptionStrings = append(filteredDescriptionStrings, descStr)
		}
	}
	item.Description = strings.Join(filteredDescriptionStrings, "\n")

	// Info Box
	dom.Find(".mw-parser-output .infobox tr").Each(func(i int, tr *goquery.Selection) {
		parseInfoBoxIntoItem(tr, &item)
	})

	fmt.Println(item)
}

func parseInfoBoxIntoItem(tr *goquery.Selection, item *models.Item) {
	typeKey := strings.TrimSpace(tr.Find("th").Text())

	if typeKey == "" {
		parseCombatStatsIntoItem(tr, item)
		return
	}

	value := strings.TrimSpace(tr.Find("td").Text())

	switch typeKey {

	// Strings
	case "size":
		item.Size = value
	case "element":
		item.Element = value
	case "examine":
		item.Examine = value
	case "effect":
		item.Effect = value
	case "attribute":
		item.Attribute = value
	case "race":
		item.Race = value
	case "gender":
		item.Gender = value
	case "type":
		item.Type = value
	case "tool":
		item.Tool = value
	case "trap":
		item.Trap = value
	case "league":
		item.League = value
	case "duration":
		item.Duration = value
	case "composer":
		item.Composer = value
	case "location":
		item.Location = value
	case "locations":
		item.Locations = value
	case "tutorial":
		item.Tutorial = value
	case "quest":
		item.Quest = value
	case "room":
		item.Room = value
	case "destroy":
		item.Destroy = value
	case "seed":
		item.Seed = value
	case "plant":
		item.Plant = value
	case "cost":
		item.Cost = value
	case "crop":
		item.Crop = value
	case "category":
		item.Category = value
	case "turael":
		item.Turael = value
	case "spira":
		item.Spira = value
	case "krystilia":
		item.Krystilia = value
	case "mazchna":
		item.Mazchna = value
	case "role":
		item.Role = value
	case "founder":
		item.Founder = value
	case "team":
		item.Team = value
	case "vannaka":
		item.Vannaka = value
	case "chaeldar":
		item.Chaeldar = value
	case "amunition":
		item.Amunition = value
	case "konar":
		item.Konar = value
	case "album":
		item.Album = value
	case "nieve":
		item.Nieve = value
	case "bait":
		item.Bait = value
	case "duradel":
		item.Duradel = value
	case "facility":
		item.Facility = value
	case "monster":
		item.Monster = value
	case "spellbook":
		item.Spellbook = value
	case "tier":
		item.Tier = value
	case "yield":
		item.Yield = value
	case "owner":
		item.Owner = value
	case "specialty":
		item.Specialty = value
	case "patch":
		item.Patch = value
	case "respawn time":
		item.RespawnTime = value
	case "wilderness level":
		item.WildernessLevel = value
	case "reward currency":
		item.RewardCurrency = value
	case "unlock hint":
		item.UnlockHint = value
	case "agility course":
		item.AgilityCourse = value
	case "quest series":
		item.QuestSeries = value
	case "growth time":
		item.GrowthTime = value
	case "other":
		item.OtherRequirements = value
	case "furniture name":
		item.FurnitureName = value
	case "drain rate":
		item.DrainRate = value
	case "combat level":
		item.CombatLevel = value
	case "description":
		item.InfoDescription = value
	case "required tool":
		item.RequiredTool = value
	case "official difficulty":
		item.OfficialDifficulty = value
	case "fishing spot":
		item.FishingSpot = value
	case "current leader":
		item.CurrentLeader = value
	case "social media":
		item.SocialMedia = value
	case "uses item":
		item.UsesItem = value

		// Numbers
	case "participants":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.Participants = floatValue
		}
	case "value":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.Value = floatValue
		}
	case "weight":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.Weight = floatValue
		}
	case "level":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.Level = floatValue
		}
	case "experience":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.Experience = floatValue
		}
	case "floors":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.Floors = floatValue
		}
	case "exchange":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.Exchange = floatValue
		}
	case "max hit":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.MaxHit = floatValue
		}
	case "monster id":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.MonsterId = floatValue
		}
	case "high alch":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.HighAlch = floatValue
		}
	case "low alch":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.LowAlch = floatValue
		}
	case "buy limit":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.BuyLimit = floatValue
		}
	case "daily volume":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.DailyVolume = floatValue
		}
	case "npc id":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.ObjectId = floatValue
		}
	case "object id":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.ObjectId = floatValue
		}
	case "item id":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.ItemId = floatValue
		}
	case "seeds per":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.SeedsPer = floatValue
		}
	case "construction level":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.ConstructionLevel = floatValue
		}
	case "icon id":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.IconId = floatValue
		}
	case "icon item id":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.IconItemId = floatValue
		}
	case "wikisync id":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.WikisyncId = floatValue
		}
	case "level required":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.LevelRequired = floatValue
		}
	case "agility xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.AgilityXp = floatValue
		}
	case "slayer level":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.SlayerLevel = floatValue
		}
	case "slayer xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.SlayerXp = floatValue
		}
	case "thieving xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.ThievingXp = floatValue
		}
	case "prayer xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.PrayerXp = floatValue
		}
	case "construction xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.ConstructionXp = floatValue
		}
	case "woodcutting xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.WoodcuttingXp = floatValue
		}
	case "firemaking xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.FiremakingXp = floatValue
		}
	case "hunter xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.HunterXp = floatValue
		}
	case "mining xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.MiningXp = floatValue
		}
	case "casting speed":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.CastingSpeed = floatValue
		}
	case "base max hit":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.BaseMaxHit = floatValue
		}
	case "fishing xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.FishingXp = floatValue
		}
	case "xp bonus":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.XpBonus = floatValue
		}
	case "strength xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.StrengthXp = floatValue
		}
	case "push duration":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.PushDuration = floatValue
		}
	case "planting xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.PlantingXp = floatValue
		}
	case "checking xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.CheckingXp = floatValue
		}
	case "harvesting xp":
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			item.HarvestingXp = floatValue
		}

		// Dates
	case "removal":
		if dateValue, err := time.Parse("January 02 2006", value); err == nil {
			item.Removal = &dateValue
		}
	case "released":
		if dateValue, err := time.Parse("January 02 2006", value); err == nil {
			item.Released = &dateValue
		}
	case "employed":
		if dateValue, err := time.Parse("January 02 2006", value); err == nil {
			item.Employed = &dateValue
		}

		// Yes/No Booleans
	case "members":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Members = boolValue
		}
	case "aggressive":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Aggressive = boolValue
		}
	case "poisonous":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Poisonous = boolValue
		}
	case "tradeable":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Tradeable = boolValue
		}
	case "bankable":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Bankable = boolValue
		}
	case "payment":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Payment = boolValue
		}
	case "edible":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Edible = boolValue
		}
	case "equipable":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Equipable = boolValue
		}
	case "stackable":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Stackable = boolValue
		}
	case "stacks in bank":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.StacksInBank = boolValue
		}
	case "regrow":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Regrow = boolValue
		}
	case "noteable":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Noteable = boolValue
		}
	case "flatpackable":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Flatpackable = boolValue
		}
	case "retaliation":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.Retaliation = boolValue
		}
	case "quest item":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.QuestItem = boolValue
		}
	case "two handed?":
		if boolValue, err := utils.YesNoToBool(value); err == nil {
			item.TwoHanded = boolValue
		}

		// Immunity Booleans
	case "poison":
		if boolValue, err := utils.ImmunityToBool(value); err == nil {
			item.PoisonImmunity = boolValue
		}
	case "venom":
		if boolValue, err := utils.ImmunityToBool(value); err == nil {
			item.VenomImmunity = boolValue
		}
	case "cannons":
		if boolValue, err := utils.ImmunityToBool(value); err == nil {
			item.CannonsImmunity = boolValue
		}
	case "thralls":
		if boolValue, err := utils.ImmunityToBool(value); err == nil {
			item.ThrallsImmunity = boolValue
		}

		// Comma separated strings
	case "skills":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Skills = append(item.Skills, strings.TrimSpace(v))
		}
	case "options":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Options = append(item.Options, strings.TrimSpace(v))
		}
	case "music":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Music = append(item.Music, strings.TrimSpace(v))
		}
	case "headquarters":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Headquarters = append(item.Headquarters, strings.TrimSpace(v))
		}
	case "inhabitants":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Inhabitants = append(item.Inhabitants, strings.TrimSpace(v))
		}
	case "hotspot":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Hotspot = append(item.Hotspot, strings.TrimSpace(v))
		}
	case "shop":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Shop = append(item.Shop, strings.TrimSpace(v))
		}
	case "platforms":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Platforms = append(item.Platforms, strings.TrimSpace(v))
		}
	case "products":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Products = append(item.Products, strings.TrimSpace(v))
		}
	case "instruments":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.Instruments = append(item.Instruments, strings.TrimSpace(v))
		}
	case "attack style":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.AttackStyle = append(item.AttackStyle, strings.TrimSpace(v))
		}
	case "worn options":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.WornOptions = append(item.WornOptions, strings.TrimSpace(v))
		}
	case "also called":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.AlsoCalled = append(item.AlsoCalled, strings.TrimSpace(v))
		}
	case "build type":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.BuildType = append(item.BuildType, strings.TrimSpace(v))
		}
	case "lead developer(s)":
		values := strings.Split(value, ",")
		for _, v := range values {
			item.LeadDevelopers = append(item.LeadDevelopers, strings.TrimSpace(v))
		}

		// Image Sources
	case "icon":
		src, exists := tr.Find("img").Attr("src")
		if exists {
			item.Icon = fmt.Sprintf("%s%s", BASE_URL, src)
		}
	case "minimap icon":
		src, exists := tr.Find("img").Attr("src")
		if exists {
			item.Icon = fmt.Sprintf("%s%s", BASE_URL, src)
		}
	case "map icon":
		src, exists := tr.Find("img").Attr("src")
		if exists {
			item.Icon = fmt.Sprintf("%s%s", BASE_URL, src)
		}

		// Separate A's
	case "teleports":
		tr.Find("a").Each(func(i int, a *goquery.Selection) {
			item.Teleports = append(item.Teleports, a.Text())
		})
	}
}

func parseCombatStatsIntoItem(tr *goquery.Selection, item *models.Item) {

}
