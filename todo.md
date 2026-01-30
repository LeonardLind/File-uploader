### TODOS: 
upload manualy into s3 wont autofill metadata and doest show up in app. client side listening vs backend lamba? 

adjust the pagnation buffer to how many itmes calc, check for draft/id/done for when default and when filters are toggle and same for display.
Pythonscript to cross-check iNaturalist vs IUCN (ask veni) 
Make manual select plot/sensor/exp etc be based on a ddb table not from what exist in the table atm 

### ui improvemnt: 
workshop better/more clear naming for "id" and "done" (stina suggestion)
Change logo to new logo (stina mention)
Change the temp backround login/upload forest img
Highlight EDITOR reconsider layout for right aside. 


### Questions - 
walk thru the domesticate list with andrew and talk if its good or bad. fine for a short list to be hard-coded (lazy) or create a dynamo table for it? 
some domesticate animals exist like cat, dog , cattle , goat , water buffalo, guinea pig. how to we do it so people dont confues and pick from that list vs the curated special list?  SUGGERSTION block/filter out those species and hide before showing the dropdown. cons lose iucn status. 

### Answered: 
Do we wanna downstream domesticated animals? (Andrew- YES!)
Do we wanna store videos of domesticated animals? (Andrew- YES!)
iNaturalist & IUCN ONLY NEEDS TO FILTERS FROM MAMMALS AND BIRDS (confirmed by Andrew -"for the camera trap - no we care about them - but they will be impossible to ID. Even Reptiles and amphibians will be very much the outliyer )
reconsider showing the status draft/id/done/display within the table. (last update: Andrew "keep" )
worth doing a Pythonscript to cross-check iNaturalist vs IUCN? (sure ask veni to do it)



### list of aniamls that i found that exist in Inaturalist but not in iucn:
Rhinolophus monoceros
Formosan Lesser Horseshoe Bat

### Todo for OVERVIEW FEATURE: last update ( Andrew "put a pin in it")
[
consider making each card in Species summary clickble to auto filter to show those in the table. 
consider adding new filter option to filer by threat lvl.  
reconsider different layout for showing the Species summary
consider adding filter in the species summary to filder by threat lvl. or categories (Mammals birds, reptiles etc)
consider showing data of number of lc, cr, en , vu , ew, ex. was found. 
consider general filter option like sort big > small etc 
]
