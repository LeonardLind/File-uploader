consider adding iNaturalist api for prefix search (iucn does not provide it) (Go ahead and give it a try)

clean up iucnController.mts now when we not doing common name or prefix with iucn. 

Make undantag for animals that doesnt exist in the iucn api such a domesticated animals (cats/cows)

Make manual select plot/sensor/exp etc be based on a ddb table not from what exist in the table atm 


ui improvemnt: 

auto start the view upload instantly not wait for user to click on the upload button. (maybe loading animation instead of the "upload btn" )

workshop better/more clear naming for "id" and "done" 



Highlight EDITOR reconsider layout for right aside. 
reconsider showing the status draft/id/done/display within the table. (lasat update: Andrew "keep" )



Talk about how to solve iucn not including domesticated aniamls (cats/cows)
Problem - user must selec from the iucn list inorder to lable a species (blocker- cant move to "done")

question - 
Do we wanna downstream domesticated animals? (Andrew- YES!)
Do we wanna store videos of domesticated animals? (Andrew- YES!)

Workaround - Make exeption that either choose from iucn or only "domesticated animal"  


Todo for OVERVIEW FEATURE: last update ( Andrew "put a pin in it")
[
consider making each card in Species summary clickble to auto filter to show those in the table. 
consider adding new filter option to filer by threat lvl.  
reconsider different layout for showing the Species summary
consider adding filter in the species summary to filder by threat lvl. or categories (Mammals birds, reptiles etc)
consider showing data of number of lc, cr, en , vu , ew, ex. was found. 
consider general filter option like sort big > small etc 
]